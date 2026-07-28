import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../main";
import LoadingState from "../components/LoadingState";
import toast from "react-hot-toast";
import { FiPhone, FiRepeat, FiTruck } from "react-icons/fi";
import { useAppData } from "../context/AppContext";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const statusLabel = (status: string) => status.replaceAll("_", " ");
const formatOrderDate = (date: Date | string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { fetchCart } = useAppData();
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/myorder`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  const reorder = async (order: IOrder) => {
    try {
      setReorderingId(order._id);
      for (const item of order.items) {
        for (let count = 0; count < item.quauntity; count += 1) {
          await axios.post(
            `${restaurantService}/api/cart/add`,
            {
              restaurantId: order.restaurantId,
              itemId: item.itemId,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
        }
      }
      await fetchCart();
      toast.success("Previous order added to cart");
      navigate("/cart");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Unable to reorder this order right now"
      );
    } finally {
      setReorderingId(null);
    }
  };

  if (loading) {
    return (
      <LoadingState
        eyebrow="Orders"
        title="Collecting your order trail"
        copy="We are pulling in active deliveries, completed orders, and recent updates."
      />
    );
  }

  if (orders.length === 0) {
    return (
      <div className="page-wrap flex min-h-[60vh] items-center justify-center">
        <div className="glass-card px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-[#1f1a17]">No orders yet</h1>
          <p className="section-copy mt-3 text-sm">
            Your placed orders will appear here once you start ordering.
          </p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter(
    (o) => !ACTIVE_STATUSES.includes(o.status)
  );

  return (
    <div className="page-wrap space-y-6 py-6">
      <section className="hero-panel fade-up p-5 sm:p-6">
        <p className="pill-label">Order History</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f1a17]">
          Track every order in one place
        </h1>
        <p className="section-copy mt-3 text-sm">
          Follow live deliveries, reopen completed orders, and stay updated as
          statuses change.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1f1a17]">Active Orders</h2>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {activeOrders.length}
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="soft-card p-5 text-sm text-[var(--text-soft)]">
            You do not have any active orders right now.
          </div>
        ) : (
          activeOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              onClick={() => navigate(`/order/${order._id}`)}
            />
          ))
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1f1a17]">Order History</h2>
          <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#64748b]">
            {completedOrders.length}
          </span>
        </div>

        {completedOrders.length === 0 ? (
          <div className="soft-card p-5 text-sm text-[var(--text-soft)]">
            Delivered and cancelled orders will appear here with their dates.
          </div>
        ) : (
          completedOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              history
              onClick={() => navigate(`/order/${order._id}`)}
              onReorder={() => reorder(order)}
              reordering={reorderingId === order._id}
            />
          ))
        )}
      </section>
    </div>
  );
};

const OrderRow = ({
  order,
  history = false,
  onClick,
  onReorder,
  reordering = false,
}: {
  order: IOrder;
  history?: boolean;
  onClick: () => void;
  onReorder?: () => void;
  reordering?: boolean;
}) => {
  const isDelivered = order.status === "delivered";

  return (
    <div
      className="soft-card cursor-pointer p-5 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1f1a17]">
            {order.restaurantName}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">
            Order #{order._id.slice(-6)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold capitalize text-[var(--accent)]">
          {statusLabel(order.status)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#eef6ff] px-3 py-1 font-semibold text-[var(--text-soft)]">
          Ordered: {formatOrderDate(order.createdAt)}
        </span>
        {history && (
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              isDelivered
                ? "bg-[#eef8f1] text-[#25553f]"
                : "bg-[#f5eeee] text-[#8a4b4b]"
            }`}
          >
            {isDelivered ? "Delivered" : "Updated"}:{" "}
            {formatOrderDate(order.updatedAt)}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
        {order.items.map((item) => `${item.name} x ${item.quauntity}`).join(", ")}
      </p>

      {(order.riderName || order.riderPhone || order.riderImage) && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#d8e3ef] bg-[#f8fbff] p-3">
          {order.riderImage ? (
            <img
              src={order.riderImage}
              alt={order.riderName || "Assigned rider"}
              className="h-12 w-12 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <FiTruck size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
              Assigned Rider
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[#1f1a17]">
              {order.riderName || "Rider assigned"}
            </p>
            {order.riderPhone && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[var(--text-soft)]">
                <FiPhone size={13} />
                {order.riderPhone}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-between border-t border-[#d8e3ef] pt-3 text-sm">
        <span className="text-[var(--text-soft)]">Total</span>
        <span className="font-semibold text-[#1f1a17]">Rs {order.totalAmount}</span>
      </div>

      {history && isDelivered && onReorder && (
        <button
          type="button"
          disabled={reordering}
          onClick={(event) => {
            event.stopPropagation();
            onReorder();
          }}
          className="action-button mt-4 w-full px-4 py-3 text-sm disabled:opacity-60"
        >
          <FiRepeat size={16} />
          {reordering ? "Adding to cart..." : "Reorder"}
        </button>
      )}
    </div>
  );
};

export default Orders;
