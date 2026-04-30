import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import { FiLogOut, FiTrendingUp, FiTruck } from "react-icons/fi";
import type { IOrder } from "../types";
import audio from "../assets/faaah.mp3";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";

interface IRider {
  _id: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  picture: string;
  isVerified: boolean;
  isAvailble: boolean;
}

type RiderStatsRange = "today" | "7d" | "30d";

interface IRiderStats {
  totalEarnings: number;
  totalOrdersDelivered: number;
  range: RiderStatsRange;
}

const RiderDashboard = () => {
  const { user, setIsAuth, setUser } = useAppData();
  const { socket } = useSocket();

  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [statsRange, setStatsRange] = useState<RiderStatsRange>("7d");
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<IRiderStats>({
    totalEarnings: 0,
    totalOrdersDelivered: 0,
    range: "7d",
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.preload = "auto";
  }, []);

  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      toast.success("Sound Enabled");
    } catch (error) {
      toast.error("Tap again to enable sound");
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onOrderAvailable = ({ orderId }: { orderId: string }) => {
      setIncomingOrders((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId]
      );

      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
      }, 10000);
    };

    socket.on("order:available", onOrderAvailable);

    return () => {
      socket.off("order:available", onOrderAvailable);
    };
  }, [socket, audioUnlocked]);

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
    } catch (error) {
      console.log(error);
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

  useEffect(() => {
    if (profile) {
      fetchDashboardStats(statsRange);
    }
  }, [profile, statsRange]);

  const toggleAvailiblity = async () => {
    if (!navigator.geolocation) {
      toast.error("Location Access Required");
      return;
    }

    setToggling(true);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await axios.patch(
          `${riderService}/api/rider/toggle`,
          {
            isAvailble: !profile?.isAvailble,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        toast.success(
          profile?.isAvailble ? "You are offline" : "You are online"
        );
        const nextIsAvailable = !profile?.isAvailble;
        await fetchProfile();

        if (nextIsAvailable) {
          fetchNearbyAvailableOrders();
        } else {
          setIncomingOrders([]);
        }
      } catch (error: any) {
        toast.error(error.response.data.message);
      } finally {
        setToggling(false);
      }
    });
  };

  const logoutHandler = () => {
    localStorage.setItem("token", "");
    setIsAuth(false);
    setUser(null);
    toast.success("Logged out successfully");
  };

  const [phoneNumber, setPhoneNumber] = useState("");
  const [aadharNumber, setaadharNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!navigator.geolocation) {
      toast.error("Location Access Required");
      return;
    }

    setSubmitting(true);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const formData = new FormData();

      formData.append("phoneNumber", phoneNumber);
      formData.append("aadharNumber", aadharNumber);
      formData.append("drivingLicenseNumber", drivingLicenseNumber);
      formData.append("latitude", pos.coords.latitude.toString());
      formData.append("longitude", pos.coords.longitude.toString());

      if (image) {
        formData.append("file", image);
      }

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
        toast.error(error.response.data.message);
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (user?.role !== "rider") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        You are not registered as a rider
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        Loading rider details...
      </div>
    );
  }

  if (!profile)
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
          <h1 className="text-xl font-semibold">Add Your Profile</h1>
          <input
            type="number"
            placeholder="Aadhar number"
            value={aadharNumber}
            onChange={(e) => setaadharNumber(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
          />
          <input
            type="number"
            placeholder="Contact Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
          />

          <input
            type="text"
            placeholder="driving Licence"
            value={drivingLicenseNumber}
            onChange={(e) => setDrivingLicenseNumber(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
            <BiUpload className="h-5 w-5 text-red-500" />
            {image ? image.name : "Upload your image"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </label>

          <button
            className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#e23744]"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Add Profile"}
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={profile.picture}
                  className="h-20 w-20 rounded-2xl object-cover"
                  alt=""
                />
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {user?.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile.phoneNumber}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {profile.isVerified ? "Verified" : "Pending"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {profile.isAvailble ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                {profile.isVerified && !currentOrder && (
                  <button
                    onClick={toggleAvailiblity}
                    disabled={toggling}
                    className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white ${
                      toggling
                        ? "bg-gray-400"
                        : profile.isAvailble
                        ? "bg-gray-700 hover:bg-gray-800"
                        : "bg-[#e23744] hover:bg-[#cc3240]"
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
                  onClick={logoutHandler}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <FiLogOut size={16} />
                  Logout
                </button>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-blue-500">
              Please be within a 500 m radius of any restaurant (which we call a
              hotspot) before going online as a rider to receive orders.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap gap-2">
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
                      ? "bg-[#e23744] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-[#fff4ef] to-[#fffaf7] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Total Earnings
                  </p>
                  <FiTrendingUp className="text-[#e23744]" size={18} />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-900">
                  {statsLoading ? "..." : `Rs ${stats.totalEarnings}`}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Rider earnings for the selected period
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#eef8ff] to-[#f8fcff] p-5">
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

        {!audioUnlocked && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {/* <span className="text-2xl">Bell</span> */}
                <div>
                  <p className="font-medium text-blue-900">
                    Enable Sound Notification
                  </p>
                  <p className="text-sm text-blue-700">
                    Get notified when new orders arrive
                  </p>
                </div>
              </div>

              <button
                onClick={unlockAudio}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Enable sound
              </button>
            </div>
          </div>
        )}

        {profile.isAvailble && incomingOrders.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Incoming Orders</h3>
            {incomingOrders.map((id) => (
              <RiderOrderRequest
                key={id}
                orderId={id}
                onAccepted={() => {
                  fetchProfile();
                  fetchCurrentOrder();
                }}
              />
            ))}
          </div>
        )}

        {currentOrder && (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <RiderCurrentOrder
                order={currentOrder}
                onStatusUpdate={() => {
                  fetchCurrentOrder();
                  fetchDashboardStats(statsRange);
                }}
              />
            </div>
            <div className="space-y-4">
              <RiderOrderMap order={currentOrder} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;
