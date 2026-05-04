import axios from "axios";
import type { IOrder } from "../types";
import { riderService } from "../main";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiDollarSign,
  FiMapPin,
  FiNavigation,
  FiPhoneCall,
} from "react-icons/fi";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: Props) => {
  const statusLabel = order.status.replace("_", " ");
  const canAdvance =
    order.status === "rider_assigned" || order.status === "picked_up";
  const nextActionLabel =
    order.status === "rider_assigned"
      ? "Reached Restaurant"
      : order.status === "picked_up"
        ? "Mark as Delivered"
        : "";

  const updateStatus = async () => {
    try {
      await axios.put(
        `${riderService}/api/rider/order/update/${order._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Order status updated");
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.response.data.message);
    }
  };

  return (
    <div className="overflow-hidden rounded-[26px] border-2 border-[var(--text)] bg-white shadow-[7px_7px_0_var(--text)]">
      <div className="border-b-2 border-[var(--text)] bg-gradient-to-r from-[var(--accent-soft)] via-white to-[#e8fff6] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="pill-label">Active Delivery</p>
            <h1 className="mt-3 text-2xl font-black text-[var(--text)]">
              Current Order
            </h1>
          </div>
          <span className="rounded-full border-2 border-[var(--text)] bg-[var(--accent-2)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--text)] shadow-[3px_3px_0_var(--text)]">
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3">
          <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[var(--surface-muted)] p-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-white text-[var(--accent)] shadow-[3px_3px_0_var(--accent-2)]">
                <FiNavigation />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                  Pickup
                </p>
                <p className="mt-1 truncate text-base font-semibold text-[var(--text)]">
                  {order.restaurantName}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-white p-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[3px_3px_0_var(--accent-3)]">
                <FiMapPin />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                  Drop
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                  {order.deliveryAddress.fromattedAddress}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--text)] bg-gradient-to-br from-white to-[var(--accent-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-soft)]">
                Order Total
              </p>
              <FiDollarSign className="text-[var(--accent)]" />
            </div>
            <p className="mt-3 text-2xl font-black text-[var(--text)]">
              Rs {order.totalAmount}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[var(--text)] bg-gradient-to-br from-[#e8fff6] to-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-soft)]">
                Your Earning
              </p>
              <FiCheckCircle className="text-[var(--success)]" />
            </div>
            <p className="mt-3 text-2xl font-black text-[var(--text)]">
              Rs {order.riderAmount}
            </p>
          </div>
        </div>

        {order.deliveryAddress.mobile && (
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-[var(--text)] bg-white p-4 shadow-[4px_4px_0_color-mix(in_srgb,var(--accent)_20%,transparent)] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                Customer Phone
              </p>
              <p className="mt-1 text-lg font-black text-[var(--text)]">
                {order.deliveryAddress.mobile}
              </p>
            </div>
            <a
              href={`tel:${order.deliveryAddress.mobile}`}
              className="brand-button min-h-12 px-5 py-3 text-sm font-semibold"
            >
              <FiPhoneCall size={16} />
              Call
            </a>
          </div>
        )}

        {canAdvance && (
          <button
            onClick={() => updateStatus()}
            className="brand-button w-full min-h-13 py-3.5 text-sm font-black uppercase tracking-[0.08em]"
          >
            {nextActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default RiderCurrentOrder;
