import { useCallback, useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiMapPin,
  FiShield,
  FiTrendingUp,
  FiTruck,
} from "react-icons/fi";
import { LuLocateFixed } from "react-icons/lu";
import type { IOrder } from "../types";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import { SkeletonState } from "../components/LoadingState";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface IRider {
  _id: string;
  riderName?: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailble: boolean;
  lastActiveAt?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
}

type RiderStatsRange = "today" | "7d" | "30d";

interface IRiderStats {
  totalEarnings: number;
  totalOrdersDelivered: number;
  range: RiderStatsRange;
}

interface IRiderHistoryOrder {
  _id: string;
  pickup: string;
  drop: string;
  deliveredAt: string;
  orderAmount: number;
  riderEarning: number;
  distance: number;
}

const formatMoney = (amount: number) =>
  `Rs ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDeliveryDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const getOnlineDuration = (lastActiveAt?: string) => {
  if (!lastActiveAt) return "Not tracked yet";
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  if (diffMs < 0) return "Just now";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  return `${hours}h ${remainingMinutes}m`;
};

const RiderLocationPicker = ({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

const RecenterRiderMap = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], 14, { animate: true });
  }, [latitude, longitude, map]);

  return null;
};

const getRiderPoint = (profile: IRider | null) => {
  const coordinates = profile?.location?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
};

type RiderDocumentField = "phoneNumber" | "aadharNumber" | "drivingLicenseNumber";

const emptyRiderFieldErrors: Record<RiderDocumentField, string> = {
  phoneNumber: "",
  aadharNumber: "",
  drivingLicenseNumber: "",
};

const getRiderFieldError = (field: RiderDocumentField, value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    if (field === "aadharNumber") return "Aadhaar number is required";
    if (field === "phoneNumber") return "Phone number is required";
    return "Driving licence number is required";
  }

  if (field === "aadharNumber") {
    if (!/^\d+$/.test(trimmedValue)) return "Only use numbers";
    if (trimmedValue.length !== 12) return "Aadhaar must be exactly 12 digits";
  }

  if (field === "phoneNumber") {
    if (!/^\d+$/.test(trimmedValue)) return "Only use numbers";
    if (!/^[6-9]/.test(trimmedValue)) return "Mobile number must start with 6, 7, 8, or 9";
    if (trimmedValue.length !== 10) return "Mobile number must be 10 digits";
  }

  if (field === "drivingLicenseNumber") {
    if (!/^[A-Z0-9]+$/.test(trimmedValue)) return "Only use letters and numbers";
    if (!/^[A-Z]{2}/.test(trimmedValue)) return "Start with 2 letters";
    if (trimmedValue.length >= 4 && !/^[A-Z]{2}[0-9]{2}/.test(trimmedValue)) {
      return "Use 2 letters followed by 2 numbers";
    }
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{7,13}$/.test(trimmedValue)) {
      return "Driving licence must be 11 to 17 letters/numbers";
    }
  }

  return "";
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="field-error">{message}</p> : null;

const RiderDashboard = () => {
  const { user } = useAppData();
  const { socket } = useSocket();

  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [statsRange, setStatsRange] = useState<RiderStatsRange>("7d");
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<IRiderStats>({
    totalEarnings: 0,
    totalOrdersDelivered: 0,
    range: "7d",
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<IRiderHistoryOrder[]>([]);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedRiderPoint, setSelectedRiderPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const removeIncomingOrder = useCallback((orderId: string) => {
    setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOrderAvailable = ({ orderId }: { orderId: string }) => {
      if (!profile?.isVerified || !profile?.isAvailble || currentOrder) return;

      setIncomingOrders((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId]
      );

      setTimeout(() => {
        removeIncomingOrder(orderId);
      }, 10000);
    };

    socket.on("order:available", onOrderAvailable);

    return () => {
      socket.off("order:available", onOrderAvailable);
    };
  }, [
    socket,
    profile?.isVerified,
    profile?.isAvailble,
    currentOrder,
    removeIncomingOrder,
  ]);

  const fetchNearbyAvailableOrders = async () => {
    try {
      const { data } = await axios.get(
        `${riderService}/api/rider/orders/available`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const orderIds = (data.orders || [])
        .map((order: { _id?: string }) => order._id)
        .filter(Boolean);

      setIncomingOrders((prev) => {
        const merged = new Set([...prev, ...orderIds]);
        return Array.from(merged);
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const riderPoint = getRiderPoint(profile);
    if (riderPoint) {
      setSelectedRiderPoint(riderPoint);
    }
  }, [profile?._id, profile?.location?.coordinates?.[0], profile?.location?.coordinates?.[1]]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/myprofile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setProfile(data || null);
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "rider") fetchProfile();
    else setLoading(false);
  }, [user]);

  const fetchCurrentOrder = async () => {
    try {
      const { data } = await axios.get(
        `${riderService}/api/rider/order/current`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setCurrentOrder(data.order);
    } catch {
      setCurrentOrder(null);
    }
  };

  useEffect(() => {
    fetchCurrentOrder();
  }, []);

  useEffect(() => {
    if (
      profile?.isVerified &&
      profile?.isAvailble &&
      !currentOrder
    ) {
      fetchNearbyAvailableOrders();
    }

    if (!profile?.isAvailble) {
      setIncomingOrders([]);
    }
  }, [profile?.isVerified, profile?.isAvailble, currentOrder?._id]);

  const fetchDashboardStats = async (range: RiderStatsRange) => {
    try {
      setStatsLoading(true);
      const { data } = await axios.get(
        `${riderService}/api/rider/dashboard/stats`,
        {
          params: { range },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setStats({
        totalEarnings: data.totalEarnings || 0,
        totalOrdersDelivered: data.totalOrdersDelivered || 0,
        range: data.range || range,
      });
    } catch (error) {
      console.log(error);
      setStats({
        totalEarnings: 0,
        totalOrdersDelivered: 0,
        range,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRiderHistory = async (range: RiderStatsRange) => {
    try {
      setHistoryLoading(true);
      const { data } = await axios.get(
        `${riderService}/api/rider/dashboard/history`,
        {
          params: { range, limit: 20 },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setHistoryOrders(data.orders || []);
    } catch (error) {
      console.log(error);
      setHistoryOrders([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardStats(statsRange);
      fetchRiderHistory(statsRange);
    }
  }, [profile, statsRange]);

  const toggleAvailiblity = async () => {
    const riderPoint = getRiderPoint(profile);

    if (!riderPoint) {
      toast.error("Set your rider hotspot first");
      setLocationModalOpen(true);
      return;
    }

    setToggling(true);

    try {
      await axios.patch(
        `${riderService}/api/rider/toggle`,
        {
          isAvailble: !profile?.isAvailble,
          latitude: riderPoint.latitude,
          longitude: riderPoint.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(profile?.isAvailble ? "You are offline" : "You are online");
      const nextIsAvailable = !profile?.isAvailble;
      await fetchProfile();

      if (nextIsAvailable) {
        fetchNearbyAvailableOrders();
      } else {
        setIncomingOrders([]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const useCurrentRiderLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedRiderPoint({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        toast.success("Current location selected");
      },
      () => toast.error("Location permission denied")
    );
  };

  const saveRiderLocation = async () => {
    if (!selectedRiderPoint) {
      toast.error("Please select a rider hotspot");
      return;
    }

    try {
      setSavingLocation(true);
      await axios.patch(
        `${riderService}/api/rider/location`,
        {
          latitude: selectedRiderPoint.latitude,
          longitude: selectedRiderPoint.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Rider hotspot updated");
      setLocationModalOpen(false);
      setIncomingOrders([]);
      await fetchProfile();

      if (profile?.isAvailble && !currentOrder) {
        fetchNearbyAvailableOrders();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update location");
    } finally {
      setSavingLocation(false);
    }
  };

  const [phoneNumber, setPhoneNumber] = useState("");
  const [aadharNumber, setaadharNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [riderFieldErrors, setRiderFieldErrors] = useState(emptyRiderFieldErrors);
  const [touchedRiderFields, setTouchedRiderFields] = useState<
    Record<RiderDocumentField, boolean>
  >({
    phoneNumber: false,
    aadharNumber: false,
    drivingLicenseNumber: false,
  });

  const updateDigitsOnly = (
    value: string,
    maxLength: number,
    setter: (nextValue: string) => void,
    field: Extract<RiderDocumentField, "phoneNumber" | "aadharNumber">
  ) => {
    const nextValue = value.replace(/\D/g, "").slice(0, maxLength);
    setter(nextValue);
    setTouchedRiderFields((prev) => ({ ...prev, [field]: true }));
    setRiderFieldErrors((prev) => ({
      ...prev,
      [field]: /\D/.test(value) ? "Only use numbers" : getRiderFieldError(field, nextValue),
    }));
  };

  const updateLicenseNumber = (value: string) => {
    const nextValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
    setDrivingLicenseNumber(nextValue);
    setTouchedRiderFields((prev) => ({ ...prev, drivingLicenseNumber: true }));
    setRiderFieldErrors((prev) => ({
      ...prev,
      drivingLicenseNumber: /[^A-Z0-9]/i.test(value)
        ? "Only use letters and numbers"
        : getRiderFieldError("drivingLicenseNumber", nextValue),
    }));
  };

  const validateRiderDocuments = () => {
    const nextErrors = {
      phoneNumber: getRiderFieldError("phoneNumber", phoneNumber),
      aadharNumber: getRiderFieldError("aadharNumber", aadharNumber),
      drivingLicenseNumber: getRiderFieldError(
        "drivingLicenseNumber",
        drivingLicenseNumber
      ),
    };

    setTouchedRiderFields({
      phoneNumber: true,
      aadharNumber: true,
      drivingLicenseNumber: true,
    });
    setRiderFieldErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const riderDocumentsInvalid = Boolean(
    getRiderFieldError("phoneNumber", phoneNumber) ||
      getRiderFieldError("aadharNumber", aadharNumber) ||
      getRiderFieldError("drivingLicenseNumber", drivingLicenseNumber)
  );

  const handleSubmit = async () => {
    if (!validateRiderDocuments()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (!image) {
      toast.error("Rider image is required");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Location Access Required");
      return;
    }

    setSubmitting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const formData = new FormData();

        formData.append("phoneNumber", phoneNumber);
        formData.append("aadharNumber", aadharNumber);
        formData.append("drivingLicenseNumber", drivingLicenseNumber);
        formData.append("latitude", pos.coords.latitude.toString());
        formData.append("longitude", pos.coords.longitude.toString());

        formData.append("file", image);

        try {
          const { data } = await axios.post(
            `${riderService}/api/rider/new`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          toast.success(data.message);
          fetchProfile();
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to create profile");
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        toast.error("Location permission denied");
        setSubmitting(false);
      }
    );
  };

  const resetRiderForm = () => {
    setPhoneNumber("");
    setaadharNumber("");
    setDrivingLicenseNumber("");
    setImage(null);
    setRiderFieldErrors(emptyRiderFieldErrors);
    setTouchedRiderFields({
      phoneNumber: false,
      aadharNumber: false,
      drivingLicenseNumber: false,
    });
  };

  const updateProfile = async () => {
    if (!validateRiderDocuments()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    const formData = new FormData();
    formData.append("phoneNumber", phoneNumber || profile?.phoneNumber || "");
    formData.append("aadharNumber", aadharNumber || profile?.aadharNumber || "");
    formData.append(
      "drivingLicenseNumber",
      drivingLicenseNumber || profile?.drivingLicenseNumber || ""
    );
    if (image) {
      formData.append("file", image);
    }

    try {
      setSubmitting(true);
      const { data } = await axios.put(
        `${riderService}/api/rider/myprofile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );
      toast.success(data.message);
      setEditingProfile(false);
      resetRiderForm();
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== "rider") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        You are not registered as a rider
      </div>
    );
  }

  if (loading) {
    return <SkeletonState type="rider-history" count={5} title="Rider dashboard" />;
  }

  if (!profile)
    return (
      <div className="page-wrap flex min-h-screen items-center py-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hero-panel fade-up hidden px-8 py-10 lg:block">
            <div className="flex items-center justify-between gap-4">
              <p className="pill-label">Rider Onboarding</p>
            </div>
            <h1 className="section-title mt-5">
              Set up your rider profile and start taking deliveries.
            </h1>
            <p className="section-copy mt-4 max-w-xl">
              Add your identity details, upload a profile photo, and share your
              live location so nearby orders can be assigned correctly.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="soft-card p-5">
                <p className="text-lg font-semibold text-[#1f1a17]">Identity</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Submit your Aadhaar and driving licence details.
                </p>
              </div>
              <div className="soft-card p-5">
                <p className="text-lg font-semibold text-[#1f1a17]">Location</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Use your current coordinates for nearby order matching.
                </p>
              </div>
              <div className="soft-card p-5">
                <p className="text-lg font-semibold text-[#1f1a17]">Approval</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Once verified, you can go online and accept deliveries.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-card fade-up mx-auto w-full max-w-xl px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex items-center justify-between gap-4">
              <p className="pill-label">Create Profile</p>
            </div>
            <h1 className="mt-5 text-center text-3xl font-semibold text-[#1f1a17]">
              Add your rider details
            </h1>
            <p className="section-copy mt-3 text-center text-sm">
              Complete your rider profile once and we will use it for verification
              and order assignment.
            </p>

            <div className="mt-8 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                placeholder="Aadhaar number"
                value={aadharNumber}
                onChange={(e) =>
                  updateDigitsOnly(e.target.value, 12, setaadharNumber, "aadharNumber")
                }
                aria-invalid={Boolean(touchedRiderFields.aadharNumber && riderFieldErrors.aadharNumber)}
                className={`field-input ${
                  touchedRiderFields.aadharNumber && riderFieldErrors.aadharNumber
                    ? "field-input-error"
                    : ""
                }`}
              />
              <FieldError
                message={
                  touchedRiderFields.aadharNumber ? riderFieldErrors.aadharNumber : ""
                }
              />
              <input
                type="text"
                inputMode="tel"
                maxLength={10}
                placeholder="Contact number"
                value={phoneNumber}
                onChange={(e) =>
                  updateDigitsOnly(e.target.value, 10, setPhoneNumber, "phoneNumber")
                }
                aria-invalid={Boolean(touchedRiderFields.phoneNumber && riderFieldErrors.phoneNumber)}
                className={`field-input ${
                  touchedRiderFields.phoneNumber && riderFieldErrors.phoneNumber
                    ? "field-input-error"
                    : ""
                }`}
              />
              <FieldError
                message={
                  touchedRiderFields.phoneNumber ? riderFieldErrors.phoneNumber : ""
                }
              />

              <input
                type="text"
                maxLength={17}
                placeholder="Driving licence number"
                value={drivingLicenseNumber}
                onChange={(e) => updateLicenseNumber(e.target.value)}
                aria-invalid={Boolean(
                  touchedRiderFields.drivingLicenseNumber &&
                    riderFieldErrors.drivingLicenseNumber
                )}
                className={`field-input ${
                  touchedRiderFields.drivingLicenseNumber &&
                  riderFieldErrors.drivingLicenseNumber
                    ? "field-input-error"
                    : ""
                }`}
              />
              <FieldError
                message={
                  touchedRiderFields.drivingLicenseNumber
                    ? riderFieldErrors.drivingLicenseNumber
                    : ""
                }
              />

              <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-[#d8e3ef] bg-white px-4 py-4 text-sm text-[var(--text-soft)] shadow-[0_12px_24px_rgba(15,23,42,0.06)] hover:bg-[#eef6ff]">
                <BiUpload className="h-5 w-5 text-[var(--accent)]" />
                <span className="truncate">
                  {image ? image.name : "Upload your rider photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>

              <div className="rounded-2xl bg-[#eef6ff] px-4 py-4 text-xs leading-6 text-[#64748b]">
                Your current location will be requested when you submit this form
                so we can register you for nearby delivery requests.
              </div>

              <button
                className="brand-button w-full py-3.5 text-sm font-semibold"
                disabled={submitting || riderDocumentsInvalid || !image}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting..." : "Create Rider Profile"}
              </button>

            </div>
          </section>
        </div>
      </div>
    );

  const riderPoint = getRiderPoint(profile);

  return (
    <div className="role-page space-y-4 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="ui-card ui-card-strong p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={profile.picture}
                  className="h-20 w-20 rounded-2xl object-cover"
                  alt=""
                />
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {profile.riderName || user?.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile.phoneNumber}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`status-badge ${profile.isVerified ? "status-badge-success" : "status-badge-warning"}`}>
                      {profile.isVerified ? "Verified" : "Pending"}
                    </span>
                    <span className={`status-badge ${profile.isAvailble ? "status-badge-success" : ""}`}>
                      {profile.isAvailble ? "Online" : "Offline"}
                    </span>
                    {profile.isAvailble && (
                      <span className="status-badge">
                        Online {getOnlineDuration(profile.lastActiveAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                {profile.isVerified && !currentOrder && (
                  <button
                    onClick={toggleAvailiblity}
                    disabled={toggling}
                    className={`action-button action-button-primary px-5 py-3 text-sm ${
                      toggling
                        ? "bg-gray-400"
                        : profile.isAvailble
                        ? "bg-[#111827] hover:bg-[#243145]"
                        : ""
                    }`}
                  >
                    {toggling
                      ? "Updating..."
                      : profile.isAvailble
                      ? "Go Offline"
                      : "Go Online"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumber(profile.phoneNumber);
                    setaadharNumber(profile.aadharNumber);
                    setDrivingLicenseNumber(profile.drivingLicenseNumber);
                    setRiderFieldErrors(emptyRiderFieldErrors);
                    setTouchedRiderFields({
                      phoneNumber: false,
                      aadharNumber: false,
                      drivingLicenseNumber: false,
                    });
                    setEditingProfile(true);
                  }}
                  className="action-button px-4 py-3 text-sm"
                >
                  Edit Documents
                </button>

              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="ui-row flex items-start gap-3 p-4">
                <FiCreditCard
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                  size={17}
                />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                    Aadhaar Number
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-[var(--text)]">
                    {profile.aadharNumber || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="ui-row flex items-start gap-3 p-4">
                <FiShield
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                  size={17}
                />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                    Driving License
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-[var(--text)]">
                    {profile.drivingLicenseNumber || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 ui-row p-4 text-sm text-[var(--text-soft)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-[var(--text)]">
                    Delivery hotspot
                  </p>
                  <p className="mt-1 leading-6">
                    FoodFleet sends ready orders from restaurants inside the 500 m
                    radius of this pinned rider location.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[var(--text)]">
                    {riderPoint
                      ? `${riderPoint.latitude.toFixed(5)}, ${riderPoint.longitude.toFixed(5)}`
                      : "No rider hotspot selected"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="action-button shrink-0 px-4 py-3 text-sm"
                >
                  <FiMapPin size={16} />
                  Set Hotspot
                </button>
              </div>
            </div>
          </div>

          <div className="ui-card ui-card-strong p-5 sm:p-6">
            <div className="mobile-tabs">
              {[
                { key: "today", label: "Today" },
                { key: "7d", label: "Last 7 Days" },
                { key: "30d", label: "Last 30 Days" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setStatsRange(option.key as RiderStatsRange)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    statsRange === option.key
                      ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="stat-panel-collapsible mt-5 grid gap-4 sm:grid-cols-2">
              <div className="ui-row p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Total Earnings
                  </p>
                  <FiTrendingUp className="text-[var(--accent)]" size={18} />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900">
                  {statsLoading ? "..." : formatMoney(stats.totalEarnings)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Base Rs 25 + Rs 12/km, minimum Rs 30 per delivery
                </p>
              </div>

              <div className="ui-row p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Orders Delivered
                  </p>
                  <FiTruck className="text-sky-600" size={18} />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900">
                  {statsLoading ? "..." : stats.totalOrdersDelivered}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Completed deliveries in this range
                </p>
              </div>
            </div>
          </div>
        </div>

        {profile.isAvailble && incomingOrders.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Incoming Orders</h3>
            {incomingOrders.map((id) => (
              <RiderOrderRequest
                key={id}
                orderId={id}
                onAccepted={() => {
                  removeIncomingOrder(id);
                  fetchProfile();
                  fetchCurrentOrder();
                }}
                onExpired={() => removeIncomingOrder(id)}
              />
            ))}
          </div>
        )}

        <section className="ui-card ui-card-strong p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="pill-label">Rider History</p>
              <h2 className="mt-3 text-2xl font-black text-[var(--text)]">
                Delivered Orders
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                Completed rides for the selected earnings period.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[var(--text)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-black text-[var(--text)]">
              {historyLoading ? "Loading..." : `${historyOrders.length} rides`}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border-2 border-[var(--text)]">
            <div className="hidden grid-cols-[1.15fr_1.45fr_0.85fr_0.7fr_0.7fr] gap-4 border-b-2 border-[var(--text)] bg-[var(--accent-soft)] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)] lg:grid">
              <span>Pickup</span>
              <span>Drop</span>
              <span>Date & Time</span>
              <span>Order</span>
              <span>Earning</span>
            </div>

            {historyLoading ? (
              <SkeletonState type="rider-history" count={4} />
            ) : historyOrders.length === 0 ? (
              <div className="grid min-h-40 place-items-center bg-[var(--surface-muted)] px-6 py-8 text-center">
                <div>
                  <p className="text-lg font-black text-[var(--text)]">
                    No delivered rides yet
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-soft)]">
                    Completed deliveries will appear here with pickup, drop,
                    order amount, and rider earning.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y-2 divide-[color-mix(in_srgb,var(--text)_10%,transparent)]">
                {historyOrders.map((ride) => (
                  <div
                    key={ride._id}
                    className="compact-mobile-row grid gap-3 bg-white px-4 py-4 hover:bg-[var(--surface-muted)] lg:grid-cols-[1.15fr_1.45fr_0.85fr_0.7fr_0.7fr] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)] lg:hidden">
                        <FiMapPin />
                        Pickup
                      </p>
                      <p className="mt-1 truncate font-semibold text-[var(--text)] lg:mt-0">
                        {ride.pickup}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)] lg:hidden">
                        <FiMapPin />
                        Drop
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-soft)] lg:mt-0">
                        {ride.drop}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)] lg:hidden">
                        <FiCalendar />
                        Delivered
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text)] lg:mt-0">
                        {formatDeliveryDate(ride.deliveredAt)}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)] lg:hidden">
                        <FiDollarSign />
                        Order
                      </p>
                      <p className="mt-1 text-sm font-black text-[var(--text)] lg:mt-0">
                        {formatMoney(ride.orderAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)] lg:hidden">
                        <FiTrendingUp />
                        Earning
                      </p>
                      <p className="mt-1 inline-flex rounded-full border-2 border-[var(--text)] bg-[var(--accent-2)] px-3 py-1 text-sm font-black text-[var(--text)] shadow-[3px_3px_0_var(--text)] lg:mt-0">
                        {formatMoney(ride.riderEarning)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                        {ride.distance.toFixed(1)} km · base Rs 25 + Rs 12/km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {currentOrder && (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <RiderCurrentOrder
                order={currentOrder}
                onStatusUpdate={() => {
                  fetchCurrentOrder();
                  fetchDashboardStats(statsRange);
                  fetchRiderHistory(statsRange);
                }}
              />
            </div>
            <div className="space-y-4">
              <RiderOrderMap order={currentOrder} />
            </div>
          </div>
        )}
      </div>
      {editingProfile && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ui-modal w-full max-w-xl p-5 sm:p-6">
            <p className="pill-label">Rider Profile</p>
            <h2 className="mt-4 text-2xl font-black text-[var(--text)]">
              Update documents
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Updating documents sends your rider profile back to pending review.
            </p>
            <div className="mt-5 space-y-4">
              <input
                className={`field-input ${
                  touchedRiderFields.phoneNumber && riderFieldErrors.phoneNumber
                    ? "field-input-error"
                    : ""
                }`}
                value={phoneNumber}
                onChange={(e) =>
                  updateDigitsOnly(e.target.value, 10, setPhoneNumber, "phoneNumber")
                }
                inputMode="tel"
                maxLength={10}
                placeholder="Phone number"
                aria-invalid={Boolean(touchedRiderFields.phoneNumber && riderFieldErrors.phoneNumber)}
              />
              <FieldError
                message={
                  touchedRiderFields.phoneNumber ? riderFieldErrors.phoneNumber : ""
                }
              />
              <input
                className={`field-input ${
                  touchedRiderFields.aadharNumber && riderFieldErrors.aadharNumber
                    ? "field-input-error"
                    : ""
                }`}
                value={aadharNumber}
                onChange={(e) =>
                  updateDigitsOnly(e.target.value, 12, setaadharNumber, "aadharNumber")
                }
                inputMode="numeric"
                maxLength={12}
                placeholder="Aadhaar number"
                aria-invalid={Boolean(touchedRiderFields.aadharNumber && riderFieldErrors.aadharNumber)}
              />
              <FieldError
                message={
                  touchedRiderFields.aadharNumber ? riderFieldErrors.aadharNumber : ""
                }
              />
              <input
                className={`field-input ${
                  touchedRiderFields.drivingLicenseNumber &&
                  riderFieldErrors.drivingLicenseNumber
                    ? "field-input-error"
                    : ""
                }`}
                value={drivingLicenseNumber}
                onChange={(e) => updateLicenseNumber(e.target.value)}
                maxLength={17}
                placeholder="Driving license number"
                aria-invalid={Boolean(
                  touchedRiderFields.drivingLicenseNumber &&
                    riderFieldErrors.drivingLicenseNumber
                )}
              />
              <FieldError
                message={
                  touchedRiderFields.drivingLicenseNumber
                    ? riderFieldErrors.drivingLicenseNumber
                    : ""
                }
              />
              <label className="ui-row flex cursor-pointer items-center gap-3 p-4 text-sm text-[var(--text-soft)]">
                <BiUpload className="h-5 w-5 text-[var(--accent)]" />
                <span className="truncate">
                  {image ? image.name : "Upload new rider photo (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="action-button px-4 py-3 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={updateProfile}
                disabled={submitting || riderDocumentsInvalid}
                className="action-button action-button-primary px-4 py-3 text-sm disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      )}
      {locationModalOpen && (
        <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ui-modal w-full max-w-3xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="pill-label">Rider Hotspot</p>
                <h2 className="mt-4 text-2xl font-black text-[var(--text)]">
                  Set delivery location
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                  Tap the map to pin where this rider should receive nearby
                  ready-for-rider orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="action-button h-10 min-h-10 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={useCurrentRiderLocation}
                className="brand-button px-4 py-3 text-sm font-semibold"
              >
                <LuLocateFixed size={16} />
                Use Current Location
              </button>
              <button
                type="button"
                onClick={saveRiderLocation}
                disabled={savingLocation || !selectedRiderPoint}
                className="action-button px-4 py-3 text-sm disabled:opacity-60"
              >
                {savingLocation ? "Saving..." : "Save Hotspot"}
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)]">
              <MapContainer
                center={[
                  selectedRiderPoint?.latitude || riderPoint?.latitude || 28.6139,
                  selectedRiderPoint?.longitude || riderPoint?.longitude || 77.209,
                ]}
                zoom={13}
                className="h-80 w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RiderLocationPicker
                  onPick={(latitude, longitude) =>
                    setSelectedRiderPoint({ latitude, longitude })
                  }
                />
                {selectedRiderPoint && (
                  <>
                    <RecenterRiderMap
                      latitude={selectedRiderPoint.latitude}
                      longitude={selectedRiderPoint.longitude}
                    />
                    <Marker
                      position={[
                        selectedRiderPoint.latitude,
                        selectedRiderPoint.longitude,
                      ]}
                    />
                  </>
                )}
              </MapContainer>
            </div>

            <div className="ui-row mt-4 p-4 text-sm text-[var(--text-soft)]">
              <p className="font-black text-[var(--text)]">Selected pin</p>
              {selectedRiderPoint ? (
                <p className="mt-1">
                  {selectedRiderPoint.latitude.toFixed(5)},{" "}
                  {selectedRiderPoint.longitude.toFixed(5)}
                </p>
              ) : (
                <p className="mt-1">Select a point on the map.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;
