import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiGrid,
  FiLogOut,
  FiShield,
  FiShoppingBag,
  FiTruck,
} from "react-icons/fi";
import { adminService } from "../main";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import RiderAdmin from "../components/RiderAdmin";
import { useAppData } from "../context/AppContext";

type AdminRestaurant = {
  _id: string;
  name: string;
  image?: string;
  phone?: string;
  isVerified: boolean;
  autoLocation?: {
    formattedAddress?: string;
  };
};

type AdminRider = {
  _id: string;
  picture?: string;
  userId?: string;
  phone?: string;
  phoneNumber?: string;
  aadharNumber?: string;
  drivingLicenseNumber?: string;
  isVerified: boolean;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
};

const Admin = () => {
  const { user, setIsAuth, setUser } = useAppData();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<AdminRestaurant[]>([]);
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"restaurant" | "rider">("restaurant");
  const [adminImageError, setAdminImageError] = useState(false);

  useEffect(() => {
    setAdminImageError(false);
  }, [user?.image]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `${adminService}/api/v1/admin/restaurant/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const response = await axios.get(
        `${adminService}/api/v1/admin/rider/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurant(data.restaurants);
      setRiders(response.data.riders);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const logoutHandler = () => {
    localStorage.setItem("token", "");
    setUser(null);
    setIsAuth(false);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleRestaurantStatusChange = (
    restaurantId: string,
    isVerified: boolean
  ) => {
    setRestaurant((prev) =>
      prev.map((item) =>
        item._id === restaurantId ? { ...item, isVerified } : item
      )
    );
  };

  const handleRiderStatusChange = (riderId: string, isVerified: boolean) => {
    setRiders((prev) =>
      prev.map((item) =>
        item._id === riderId ? { ...item, isVerified } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[#ecdccf] bg-white shadow-[0_18px_50px_rgba(120,74,37,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(255,108,55,0.14),_transparent_34%),linear-gradient(135deg,#fff8f1_0%,#fff_58%)] p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="rounded-[28px] border border-[#edd8ca] bg-white p-5 shadow-[0_16px_40px_rgba(96,61,36,0.08)]">
                <div className="flex items-center gap-4">
                  {user?.image && !adminImageError ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                      onError={() => setAdminImageError(true)}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff1e8] text-xl font-semibold text-[#e4572e]">
                      {user?.name?.[0] || "A"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b48668]">
                      Admin Profile
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-[#1f1a17]">
                      {user?.name || "Administrator"}
                    </h2>
                    <p className="truncate text-sm text-[#6d5d52]">
                      {user?.email || "No email available"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#fff6ee] p-4">
                    <div className="flex items-center gap-2 text-[#e4572e]">
                      <FiShoppingBag size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Restaurants
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[#1f1a17]">
                      {restaurant.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f5faf7] p-4">
                    <div className="flex items-center gap-2 text-[#1f9d64]">
                      <FiTruck size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Riders
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[#1f1a17]">
                      {riders.length}
                    </p>
                  </div>
                </div>

                <button
                  onClick={logoutHandler}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ead4c5] px-4 py-3 text-sm font-semibold text-[#4f3f34] transition hover:border-[#e4572e] hover:text-[#e4572e]"
                >
                  <FiLogOut size={16} />
                  Logout
                </button>
              </aside>

              <div className="rounded-[28px] border border-[#edd8ca] bg-white p-5 shadow-[0_16px_40px_rgba(96,61,36,0.08)]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fff1e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#e4572e]">
                      <FiShield size={14} />
                      Admin Dashboard
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold text-[#1f1a17]">
                      Verification Center
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d5d52]">
                      Review restaurants and riders, keep every profile visible,
                      and switch verification status whenever needed.
                    </p>
                  </div>

                  <div className="inline-flex w-full rounded-2xl bg-[#f6efe8] p-1 sm:w-auto">
                    <button
                      onClick={() => setTab("restaurant")}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${
                        tab === "restaurant"
                          ? "bg-[#e4572e] text-white shadow-[0_10px_25px_rgba(228,87,46,0.25)]"
                          : "text-[#6d5d52] hover:text-[#1f1a17]"
                      }`}
                    >
                      Restaurants
                    </button>

                    <button
                      onClick={() => setTab("rider")}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${
                        tab === "rider"
                          ? "bg-[#e4572e] text-white shadow-[0_10px_25px_rgba(228,87,46,0.25)]"
                          : "text-[#6d5d52] hover:text-[#1f1a17]"
                      }`}
                    >
                      Riders
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[#faf6f2] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#4f3f34]">
                    <FiGrid size={16} className="text-[#e4572e]" />
                    <span className="text-sm font-medium">
                      {tab === "restaurant"
                        ? "All restaurant profiles"
                        : "All rider profiles"}
                    </span>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8b6c57]">
                    {tab === "restaurant" ? restaurant.length : riders.length} entries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {tab === "restaurant" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {restaurant.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#e5c8b4] bg-white p-8 text-center text-[#6d5d52]">
                No restaurants found.
              </div>
            ) : (
              restaurant.map((r) => (
                <AdminRestaurantCard
                  key={r._id}
                  restaurant={r}
                  onStatusChange={handleRestaurantStatusChange}
                />
              ))
            )}
          </div>
        )}

        {tab === "rider" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {riders.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#e5c8b4] bg-white p-8 text-center text-[#6d5d52]">
                No riders found.
              </div>
            ) : (
              riders.map((r) => (
                <RiderAdmin
                  key={r._id}
                  rider={r}
                  onStatusChange={handleRiderStatusChange}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
