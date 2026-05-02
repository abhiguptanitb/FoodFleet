import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiEdit3,
  FiPhone,
  FiShield,
  FiTruck,
  FiX,
} from "react-icons/fi";
import { adminService } from "../main";

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

const RiderAdmin = ({
  rider,
  onStatusChange,
}: {
  rider: AdminRider;
  onStatusChange: (riderId: string, isVerified: boolean) => void;
}) => {
  const [updating, setUpdating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const toggleVerification = async () => {
    const nextStatus = !rider.isVerified;

    try {
      setUpdating(true);
      await axios.patch(
        `${adminService}/api/v1/verify/rider/${rider._id}`,
        { isVerified: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(`Rider ${nextStatus ? "verified" : "marked unverified"}`);
      onStatusChange(rider._id, nextStatus);
    } catch (error) {
      toast.error("Failed to update rider status");
    } finally {
      setUpdating(false);
    }
  };

  const riderName =
    rider.user?.name || rider.phoneNumber || rider.phone || "Rider Profile";
  const riderContact = rider.phoneNumber || rider.phone || "Phone not available";
  const statusLabel = rider.isVerified ? "Verified" : "Unverified";

  return (
    <>
      <article className="overflow-hidden rounded-[22px] border border-[#ead8cb] bg-white shadow-[0_14px_34px_rgba(88,58,37,0.08)]">
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-36 bg-[#f4e8df] sm:h-36 sm:w-40 sm:shrink-0">
            {rider.picture ? (
              <img
                src={rider.picture}
                className="h-full w-full object-cover"
                alt={riderName}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[#c1a28c]">
                <FiTruck size={30} />
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6d5d52]">
              Rider
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-[#1f1a17]">
                  {riderName}
                </h3>
                <p className="mt-1 truncate text-sm text-[#8a7464]">
                  {rider.user?.email || riderContact}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-white text-[var(--text)] shadow-[3px_3px_0_var(--accent-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                aria-label={`Review ${riderName}`}
              >
                <FiEdit3 size={17} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  rider.isVerified
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {statusLabel}
              </span>
              <span className="min-w-0 truncate rounded-full bg-[#faf6f2] px-3 py-1 text-xs text-[#8a7464] sm:max-w-[260px]">
                {riderContact}
              </span>
            </div>
          </div>
        </div>
      </article>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[8px_8px_0_var(--text)]">
            <div className="flex items-start gap-4 border-b border-[#ead8cb] bg-[var(--accent-soft)] p-5 sm:p-6">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--text)] bg-[#f4e8df] shadow-[4px_4px_0_var(--accent-2)] sm:h-24 sm:w-24">
                {rider.picture ? (
                  <img
                    src={rider.picture}
                    className="h-full w-full object-cover"
                    alt={riderName}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#c1a28c]">
                    <FiTruck size={28} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Rider Review
                </p>
                <h3 className="mt-2 truncate text-2xl font-semibold text-[#1f1a17]">
                  {riderName}
                </h3>
                <p className="mt-1 truncate text-sm text-[#8a7464]">
                  {rider.user?.email || statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--text)] bg-white text-[var(--text)] shadow-[3px_3px_0_var(--accent-2)] hover:text-[var(--accent)]"
                aria-label="Close rider details"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
                  <FiPhone className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                      Phone Number
                    </p>
                    <p className="mt-1 break-words text-sm text-[#3f332c]">
                      {riderContact}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
                  <FiCreditCard
                    className="mt-0.5 shrink-0 text-[#e4572e]"
                    size={16}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                      Aadhaar Number
                    </p>
                    <p className="mt-1 break-words text-sm text-[#3f332c]">
                      {rider.aadharNumber || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
                  <FiShield className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                      Driving License
                    </p>
                    <p className="mt-1 break-words text-sm text-[#3f332c]">
                      {rider.drivingLicenseNumber || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
                  <FiShield className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                      Current Status
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        rider.isVerified ? "text-green-700" : "text-amber-700"
                      }`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>

              <button
                disabled={updating}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition ${
                  rider.isVerified
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-[#1f9d64] hover:bg-[#168352]"
                } ${updating ? "cursor-not-allowed opacity-70" : ""}`}
                onClick={toggleVerification}
              >
                <FiShield size={16} />
                {updating
                  ? "Updating Status..."
                  : rider.isVerified
                    ? "Mark as Unverified"
                    : "Verify Rider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RiderAdmin;
