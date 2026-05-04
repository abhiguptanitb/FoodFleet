import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import {
  FiCalendar,
  FiDollarSign,
  FiLogOut,
  FiMapPin,
  FiTrendingUp,
  FiTruck,
} from "react-icons/fi";
import type { IOrder } from "../types";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import LoadingState from "../components/LoadingState";

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

const RiderDashboard = () => {
  const { user, setIsAuth, setUser } = useAppData();
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
  useEffect(() => {
    if (!socket) return;

    const onOrderAvailable = ({ orderId }: { orderId: string }) => {
      setIncomingOrders((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId]
      );

      setTimeout(() => {
        setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
      }, 10000);
    };

    socket.on("order:available", onOrderAvailable);

    return () => {
      socket.off("order:available", onOrderAvailable);
    };
  }, [socket]);

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
      <LoadingState
        eyebrow="Delivery Workspace"
        title="Checking rider readiness"
        copy="We are loading your profile, availability, current order, and earnings snapshot."
      />
    );
  }

  if (!profile)
    return (
      <div className="page-wrap flex min-h-screen items-center py-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hero-panel fade-up hidden px-8 py-10 lg:block">
            <div className="flex items-center justify-between gap-4">
              <p className="pill-label">Rider Onboarding</p>
              <button
                onClick={logoutHandler}
                className="ghost-button px-4 py-2 text-sm font-semibold"
              >
                Logout
              </button>
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
                <p className="mt-2 text-sm text-[#6d5d52]">
                  Submit your Aadhaar and driving licence details.
                </p>
              </div>
              <div className="soft-card p-5">
                <p className="text-lg font-semibold text-[#1f1a17]">Location</p>
                <p className="mt-2 text-sm text-[#6d5d52]">
                  Use your current coordinates for nearby order matching.
                </p>
              </div>
              <div className="soft-card p-5">
                <p className="text-lg font-semibold text-[#1f1a17]">Approval</p>
                <p className="mt-2 text-sm text-[#6d5d52]">
                  Once verified, you can go online and accept deliveries.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-card fade-up mx-auto w-full max-w-xl px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex items-center justify-between gap-4">
              <p className="pill-label">Create Profile</p>
              <button
                onClick={logoutHandler}
                className="ghost-button px-4 py-2 text-sm font-semibold"
              >
                Logout
              </button>
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
                type="number"
                placeholder="Aadhaar number"
                value={aadharNumber}
                onChange={(e) => setaadharNumber(e.target.value)}
                className="field-input"
              />
              <input
                type="number"
                placeholder="Contact number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="field-input"
              />

              <input
                type="text"
                placeholder="Driving licence number"
                value={drivingLicenseNumber}
                onChange={(e) => setDrivingLicenseNumber(e.target.value)}
                className="field-input"
              />

              <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-[#e7d3c6] bg-white px-4 py-4 text-sm text-[#6d5d52] shadow-[0_12px_24px_rgba(80,51,31,0.06)] hover:bg-[#fff8f3]">
                <BiUpload className="h-5 w-5 text-[#e4572e]" />
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

              <div className="rounded-2xl bg-[#fff7f1] px-4 py-4 text-xs leading-6 text-[#8a6d59]">
                Your current location will be requested when you submit this form
                so we can register you for nearby delivery requests.
              </div>

              <button
                className="brand-button w-full py-3.5 text-sm font-semibold"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting..." : "Create Rider Profile"}
              </button>

              <button
                type="button"
                onClick={logoutHandler}
                className="ghost-button w-full py-3.5 text-sm font-semibold lg:hidden"
              >
                Logout and go to login
              </button>
            </div>
          </section>
        </div>
      </div>
    );

  return (
    <div className="role-page space-y-4 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border-2 border-[var(--text)] bg-white p-5 shadow-[7px_7px_0_var(--text)] sm:p-6">
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
                    <span className="rounded-full border border-[var(--text)] bg-[var(--accent-2)] px-3 py-1 text-xs font-semibold text-[#07111f]">
                      {profile.isVerified ? "Verified" : "Pending"}
                    </span>
                    <span className="rounded-full border border-[var(--text)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
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
                        ? "bg-[#111827] hover:bg-[#243145]"
                        : "bg-[var(--accent)] hover:bg-[var(--accent-deep)]"
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
                  className="ghost-button inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold"
                >
                  <FiLogOut size={16} />
                  Logout
                </button>
              </div>
            </div>

            <p className="mt-5 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-7 text-[var(--accent-deep)]">
              Please be within a 500 m radius of any restaurant (which we call a
              hotspot) before going online as a rider to receive orders.
            </p>
          </div>

          <div className="rounded-[26px] border-2 border-[var(--text)] bg-white p-5 shadow-[7px_7px_0_var(--accent-2)] sm:p-6">
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
                      ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-[var(--text)] bg-gradient-to-br from-[var(--accent-soft)] to-white p-5">
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

              <div className="rounded-2xl border-2 border-[var(--text)] bg-gradient-to-br from-[#e8fff6] to-white p-5">
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
                  fetchProfile();
                  fetchCurrentOrder();
                }}
              />
            ))}
          </div>
        )}

        <section className="rounded-[26px] border-2 border-[var(--text)] bg-white p-5 shadow-[7px_7px_0_var(--accent-3)] sm:p-6">
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
              <div className="loading-card loading-card-compact justify-center rounded-none border-0 p-6">
                <div className="loading-orbit">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="font-black text-[var(--text)]">
                  Loading ride history
                </p>
              </div>
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
                    className="grid gap-3 bg-white px-4 py-4 hover:bg-[var(--surface-muted)] lg:grid-cols-[1.15fr_1.45fr_0.85fr_0.7fr_0.7fr] lg:items-center"
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
    </div>
  );
};

export default RiderDashboard;
