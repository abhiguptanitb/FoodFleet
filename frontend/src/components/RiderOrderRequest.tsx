import { useEffect, useState } from "react";
import { riderService } from "../main";
import axios from "axios";
import toast from "react-hot-toast";
import { FiClock, FiNavigation } from "react-icons/fi";

interface Props {
  orderId: string;
  onAccepted: () => void;
}

const RiderOrderRequest = ({ orderId, onAccepted }: Props) => {
  const [accepting, setAccepting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onAccepted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onAccepted]);

  const acceptOrder = async () => {
    try {
      await axios.post(
        `${riderService}/api/rider/accept/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Order Accepted");
      onAccepted();
    } catch (error: any) {
      toast.error(error.response.data.message);
      onAccepted();
    } finally {
      setAccepting(false);
    }
  };
  const progress = (secondsLeft / 10) * 100;

  return (
    <div className="ui-card space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="pill-label">New Request</p>
        <span className="status-badge status-badge-warning">
          <FiClock size={13} />
          {secondsLeft}s
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="ui-row p-3 text-sm">
        <p className="font-black text-[var(--text)]">Order #{orderId.slice(-6)}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
          Preview route details after acceptance. This request expires
          automatically when the countdown ends.
        </p>
      </div>

      <button
        disabled={accepting}
        onClick={acceptOrder}
        className="action-button action-button-primary w-full py-3 text-sm disabled:opacity-50"
      >
        <FiNavigation size={16} />
        {accepting ? "Accepting..." : "Accept order"}
      </button>
    </div>
  );
};

export default RiderOrderRequest;
