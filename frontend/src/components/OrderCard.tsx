import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { ORDER_ACTIONS } from "../utils/orderflow";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiTruck,
} from "react-icons/fi";

interface Props {
  order: IOrder;
  onStatusUpdate?: () => void;
  variant?: "active" | "completed";
}

const statusTone = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-[#fff7d6] text-[#9a6400] border-[#f2c94c]";
    case "accepted":
      return "bg-[#fff0e8] text-[#ad4b16] border-[#f2a36f]";
    case "preparing":
      return "bg-[var(--accent-soft)] text-[var(--accent-deep)] border-[var(--accent)]";
    case "ready_for_rider":
      return "bg-[#eef2ff] text-[#4338ca] border-[#818cf8]";
    case "rider_assigned":
      return "bg-[#e9f8ff] text-[#006ee6] border-[#00a6ff]";
    case "picked_up":
      return "bg-[#f4edff] text-[#5122c7] border-[#7c3cff]";
    case "delivered":
      return "bg-[#dcfce7] text-[#166534] border-[#86efac]";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
};

const formatMoney = (amount: number) =>
  `Rs ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDateTime = (date: Date | string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const OrderCard = ({ order, onStatusUpdate, variant = "active" }: Props) => {
  const [loading, setLoading] = useState(false);
  const [retryVisible, setRetryVisible] = useState(false);

  const actions = ORDER_ACTIONS[order.status] || [];
  const itemCount = order.items.reduce(
    (sum, item) => sum + (item.quauntity || 0),
    0
  );
  const isCompleted = variant === "completed";

  useEffect(() => {
    if (order.status !== "ready_for_rider") {
      setRetryVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setRetryVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [order.status]);

  const updateStatus = async (status: string) => {
    try {
      setLoading(true);
      setRetryVisible(false);
      await axios.put(
        `${restaurantService}/api/order/${order._id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Order updated");
      onStatusUpdate?.();
    } catch (error: any) {
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      className={`overflow-hidden rounded-[24px] border-2 border-[var(--text)] bg-white ${
        isCompleted
          ? "shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_22%,transparent)]"
          : "shadow-[6px_6px_0_var(--text)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-gradient-to-r from-white to-[var(--accent-soft)] p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-deep)]">
            Order #{order._id.slice(-6)}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-soft)]">
            <FiClock className="text-[var(--accent)]" />
            {formatDateTime(order.createdAt)}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${statusTone(
            order.status
          )}`}
        >
          {order.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-[var(--surface-muted)] p-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
              <FiPackage />
              Items
            </div>
            <div className="mt-2 space-y-1 text-sm text-[var(--text-soft)]">
              {order.items.slice(0, 3).map((item) => (
                <p key={item.itemId} className="flex justify-between gap-3">
                  <span className="truncate">{item.name}</span>
                  <span className="font-semibold text-[var(--text)]">
                    x {item.quauntity}
                  </span>
                </p>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs font-semibold text-[var(--accent)]">
                  +{order.items.length - 3} more items
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-deep)]">
              <FiMapPin />
              Drop
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">
              {order.deliveryAddress.fromattedAddress}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-[var(--text)] bg-white p-3">
            <p className="text-xs font-semibold text-[var(--text-soft)]">
              Order Amount
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text)]">
              {formatMoney(order.totalAmount)}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-[var(--text)] bg-[#e8fff6] p-3">
            <p className="text-xs font-semibold text-[var(--text-soft)]">
              Items
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text)]">
              {itemCount}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-[var(--text)] bg-[var(--accent-soft)] p-3">
            <p className="flex items-center gap-1 text-xs font-semibold text-[var(--text-soft)]">
              <FiCreditCard />
              Payment
            </p>
            <p className="mt-2 text-sm font-black capitalize text-[var(--text)]">
              {order.paymentStatus}
            </p>
          </div>
        </div>

        {order.paymentStatus === "paid" && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-[color-mix(in_srgb,var(--text)_10%,transparent)] pt-4">
            {actions.map((status) => (
              <button
                key={status}
                disabled={loading}
                onClick={() => updateStatus(status)}
                className="brand-button min-h-11 px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] disabled:opacity-50"
              >
                {status === "ready_for_rider" ? (
                  <FiTruck size={15} />
                ) : (
                  <FiCheckCircle size={15} />
                )}
                Mark {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        )}

        {order.status === "ready_for_rider" && retryVisible && (
          <button
            className="ghost-button flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-black text-[var(--accent-deep)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
            disabled={loading}
            onClick={() => updateStatus("ready_for_rider")}
          >
            <FiRefreshCw size={15} />
            Retry Rider Broadcast
          </button>
        )}
      </div>
    </article>
  );
};

export default OrderCard;
