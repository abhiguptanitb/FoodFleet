import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import axios from "axios";
import { restaurantService } from "../main";
import type { IOrder, IRestaurant } from "../types";
import LoadingState from "../components/LoadingState";
import OrderCard from "../components/OrderCard";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiSearch,
  FiShoppingBag,
  FiXCircle,
} from "react-icons/fi";

type HistoryFilter = "all" | "delivered" | "cancelled";

const formatMoney = (amount: number) =>
  `Rs ${Number(amount || 0).toLocaleString("en-IN")}`;

const RestaurantOrderHistory = () => {
  const { restaurantId } = useParams();
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");

  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant._id === restaurantId
  );

  const fetchHistoryPage = async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      const [restaurantsResponse, historyResponse] = await Promise.all([
        axios.get(`${restaurantService}/api/restaurant/mine`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }),
        axios.get(
          `${restaurantService}/api/order/restaurant/${restaurantId}/history`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        ),
      ]);

      setRestaurants(restaurantsResponse.data.restaurants || []);
      setOrders(historyResponse.data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryPage();
  }, [restaurantId]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter = filter === "all" || order.status === filter;
      const matchesSearch =
        !normalizedSearch ||
        order._id.toLowerCase().includes(normalizedSearch) ||
        order.items.some((item) =>
          item.name.toLowerCase().includes(normalizedSearch)
        ) ||
        order.deliveryAddress.fromattedAddress
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, orders, search]);

  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");
  const revenue = deliveredOrders.reduce(
    (sum, order) => sum + (order.totalAmount || 0),
    0
  );

  if (!restaurantId) {
    return <Navigate to="/partner" replace />;
  }

  if (loading) {
    return (
      <LoadingState
        eyebrow="Restaurant History"
        title="Loading order archive"
        copy="We are fetching completed orders for this outlet."
      />
    );
  }

  if (!selectedRestaurant) {
    return (
      <div className="role-page px-4 py-8">
        <div className="page-wrap">
          <div className="rounded-[28px] border-2 border-[var(--text)] bg-white p-6 text-center shadow-[8px_8px_0_var(--text)]">
            <p className="text-xl font-black text-[var(--text)]">
              Restaurant history not available
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              This restaurant was not found in your partner account.
            </p>
            <Link
              to="/partner"
              className="brand-button mt-5 inline-flex px-5 py-3 text-sm font-black"
            >
              <FiArrowLeft size={16} />
              Back to Partner Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="role-page px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[8px_8px_0_var(--text)]">
          <div className="bg-[radial-gradient(circle_at_top_left,_var(--role-glow),_transparent_34%),linear-gradient(135deg,#ffffff_0%,var(--accent-soft)_68%)] p-4 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  to="/partner"
                  className="ghost-button inline-flex items-center gap-2 px-4 py-2 text-sm font-black hover:bg-white"
                >
                  <FiArrowLeft size={16} />
                  Partner Home
                </Link>
                <p className="pill-label mt-5">Order History</p>
                <h1 className="mt-3 text-3xl font-black text-[var(--text)]">
                  {selectedRestaurant.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                  Delivered and cancelled paid orders saved for this restaurant.
                  Active orders stay on the partner home until completed.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                <div className="rounded-2xl border-2 border-[var(--text)] bg-white p-4 shadow-[4px_4px_0_var(--text)]">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                    <FiShoppingBag />
                    Revenue
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text)]">
                    {formatMoney(revenue)}
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-[var(--text)] bg-[#e8fff6] p-4 shadow-[4px_4px_0_color-mix(in_srgb,var(--accent)_22%,transparent)]">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                    <FiCheckCircle />
                    Delivered
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text)]">
                    {deliveredOrders.length}
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-[var(--text)] bg-white p-4 shadow-[4px_4px_0_var(--accent-3)]">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                    <FiXCircle />
                    Cancelled
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text)]">
                    {cancelledOrders.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-[var(--text)] p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "delivered", label: "Delivered" },
                  { key: "cancelled", label: "Cancelled" },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setFilter(option.key as HistoryFilter)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      filter === option.key
                        ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-[var(--text)] bg-white px-4 shadow-[4px_4px_0_var(--accent-2)] lg:w-[360px]">
                <FiSearch className="shrink-0 text-[var(--accent)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order, item, or address"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#7b8790]"
                />
              </div>
            </div>

            <div className="mt-5">
              {filteredOrders.length === 0 ? (
                <div className="grid min-h-48 place-items-center rounded-[24px] border-2 border-dashed border-[color-mix(in_srgb,var(--text)_28%,transparent)] bg-[var(--surface-muted)] px-6 py-8 text-center">
                  <div>
                    <p className="text-lg font-black text-[var(--text)]">
                      No history matches this view
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-soft)]">
                      Try changing the status filter or search text.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      variant="completed"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RestaurantOrderHistory;
