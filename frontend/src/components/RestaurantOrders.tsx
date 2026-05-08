import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import { Link } from "react-router-dom";
import axios from "axios";
import { restaurantService } from "../main";
import OrderCard from "./OrderCard";
import { SkeletonState } from "./LoadingState";
import {
  FiClock,
  FiExternalLink,
  FiList,
  FiShoppingBag,
  FiTruck,
} from "react-icons/fi";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const formatMoney = (amount: number) =>
  `Rs ${Number(amount || 0).toLocaleString("en-IN")}`;

const RestaurantOrders = ({
  restaurantId,
  restaurantName,
  onOrdersChange,
}: {
  restaurantId: string;
  restaurantName?: string;
  onOrdersChange?: (orders: IOrder[]) => void;
}) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/restaurant/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const fetchedOrders = data.orders || [];
      setOrders(fetchedOrders);
      onOrdersChange?.(fetchedOrders);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      setHistoryLoading(true);
      const { data } = await axios.get(
        `${restaurantService}/api/order/restaurant/${restaurantId}/history`,
        {
          params: { limit: 50 },
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

  const refreshOrders = async () => {
    await Promise.all([fetchOrders(), fetchOrderHistory()]);
  };

  useEffect(() => {
    setLoading(true);
    refreshOrders();
  }, [restaurantId]);

  useEffect(() => {
    if (!socket) return;

    const onOrderChange = () => {
      refreshOrders();
    };

    socket.on("order:new", onOrderChange);
    socket.on("order:rider_assigned", onOrderChange);
    socket.on("order:update", onOrderChange);

    return () => {
      socket.off("order:new", onOrderChange);
      socket.off("order:rider_assigned", onOrderChange);
      socket.off("order:update", onOrderChange);
    };
  }, [socket, restaurantId]);

  if (loading) {
    return <SkeletonState type="orders" count={4} title="Restaurant orders" />;
  }

  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.includes(order.status)
  );
  const historyRevenue = historyOrders.reduce(
    (sum, order) => sum + (order.totalAmount || 0),
    0
  );

  return (
    <section className="overflow-hidden rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[8px_8px_0_var(--accent-2)]">
      <div className="border-b-2 border-[var(--text)] bg-[radial-gradient(circle_at_top_left,_var(--role-glow),_transparent_34%),linear-gradient(135deg,#ffffff_0%,var(--accent-soft)_68%)] p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="pill-label">Order Desk</p>
            <h2 className="mt-3 text-2xl font-black text-[var(--text)]">
              Active & Completed Orders
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
              Track live kitchen flow and keep a permanent order history for
              {restaurantName ? ` ${restaurantName}.` : " this restaurant."}
            </p>
          </div>

          <div className="stat-panel-collapsible grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-2xl border-2 border-[var(--text)] bg-white p-4 shadow-[4px_4px_0_var(--text)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                <FiClock />
                Active
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--text)]">
                {activeOrders.length}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[var(--text)] bg-[#e8fff6] p-4 shadow-[4px_4px_0_color-mix(in_srgb,var(--accent)_22%,transparent)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                <FiList />
                History
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--text)]">
                {historyLoading ? "..." : historyOrders.length}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[var(--text)] bg-white p-4 shadow-[4px_4px_0_var(--accent-3)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
                <FiShoppingBag />
                History Sales
              </p>
              <p className="mt-2 text-2xl font-black text-[var(--text)]">
                {formatMoney(historyRevenue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-[var(--text)]">
                Active Orders
              </h3>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Orders that still need kitchen or delivery action.
              </p>
            </div>
            <span className="rounded-full border-2 border-[var(--text)] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--text)]">
              {activeOrders.length} live
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-[24px] border-2 border-dashed border-[color-mix(in_srgb,var(--text)_28%,transparent)] bg-[var(--surface-muted)] px-6 py-8 text-center">
              <div>
                <FiTruck className="mx-auto text-[var(--accent)]" size={26} />
                <p className="mt-3 text-lg font-black text-[var(--text)]">
                  No active orders
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-soft)]">
                  New paid orders will appear here as soon as customers place
                  them.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  variant="active"
                  onStatusUpdate={refreshOrders}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[24px] border-2 border-[var(--text)] bg-gradient-to-r from-white to-[var(--accent-soft)] p-4 shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_22%,transparent)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="pill-label">Archive</p>
              <h3 className="mt-3 text-xl font-black text-[var(--text)]">
                Order History
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                Completed orders move out of this dashboard and are saved in a
                dedicated history page for this restaurant.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center">
              <div className="rounded-2xl border-2 border-[var(--text)] bg-white px-4 py-3 text-sm font-black text-[var(--text)]">
                {historyLoading
                  ? "Syncing history"
                  : `${historyOrders.length} saved orders`}
              </div>
              <Link
                to={`/partner/restaurants/${restaurantId}/history`}
                className="brand-button min-h-12 px-5 py-3 text-sm font-black uppercase tracking-[0.08em]"
              >
                <FiExternalLink size={16} />
                Open History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RestaurantOrders;
