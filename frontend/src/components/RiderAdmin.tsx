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
      <article className="overflow-hidden rounded-[24px] border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-white shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_16%,transparent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[7px_7px_0_color-mix(in_srgb,var(--accent)_22%,transparent)]">
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-36 bg-[var(--accent-soft)] sm:h-36 sm:w-40 sm:shrink-0">
            {rider.picture ? (
              <img
                src={rider.picture}
                className="h-full w-full object-cover"
                alt={riderName}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--accent)]">
                <FiTruck size={30} />
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text)] shadow-sm">
              Rider
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-black text-[var(--text)]">
                  {riderName}
                </h3>
                <p className="mt-1 truncate text-sm text-[var(--text-soft)]">
                  {rider.user?.email || riderContact}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-white text-[var(--text)] shadow-[4px_4px_0_var(--accent-2)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                aria-label={`Review ${riderName}`}
              >
                <FiEdit3 size={17} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  rider.isVerified
                    ? "bg-[color-mix(in_srgb,var(--success)_16%,white)] text-[var(--success)]"
                    : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                }`}
              >
                {statusLabel}
              </span>
              <span className="min-w-0 truncate rounded-full bg-[color-mix(in_srgb,var(--text)_5%,white)] px-3 py-1 text-xs text-[var(--text-soft)] sm:max-w-[320px]">
                {riderContact}
              </span>
            </div>
          </div>
        </div>
      </article>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,17,40,0.58)] p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[9px_9px_0_var(--text)]">
            <div className="flex items-start gap-4 border-b-2 border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-[linear-gradient(135deg,var(--accent-soft),#ffffff)] p-5 sm:p-7">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--text)] bg-[var(--accent-soft)] shadow-[4px_4px_0_var(--accent-2)] sm:h-24 sm:w-24">
                {rider.picture ? (
                  <img
                    src={rider.picture}
                    className="h-full w-full object-cover"
                    alt={riderName}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--accent)]">
                    <FiTruck size={28} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Rider Review
                </p>
                <h3 className="mt-2 truncate text-2xl font-black text-[var(--text)] sm:text-3xl">
                  {riderName}
                </h3>
                <p className="mt-1 truncate text-sm text-[var(--text-soft)]">
                  {rider.user?.email || statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--text)] bg-white text-[var(--text)] shadow-[3px_3px_0_var(--accent-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                aria-label="Close rider details"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-7">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--text)_4%,white)] p-4">
                  <FiPhone className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Phone Number
                    </p>
                    <p className="mt-1 break-words text-sm text-[var(--text)]">
                      {riderContact}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--text)_4%,white)] p-4">
                  <FiCreditCard
                    className="mt-0.5 shrink-0 text-[var(--accent)]"
                    size={16}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Aadhaar Number
                    </p>
                    <p className="mt-1 break-words text-sm text-[var(--text)]">
                      {rider.aadharNumber || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--text)_4%,white)] p-4">
                  <FiShield className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Driving License
                    </p>
                    <p className="mt-1 break-words text-sm text-[var(--text)]">
                      {rider.drivingLicenseNumber || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--text)_4%,white)] p-4">
                  <FiShield className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Current Status
                    </p>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        rider.isVerified ? "text-[var(--success)]" : "text-[var(--accent-deep)]"
                      }`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>

              <button
                disabled={updating}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--text)] bg-[var(--accent)] px-4 py-3 text-sm font-black text-[#08111c] shadow-[4px_4px_0_var(--text)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-deep)] hover:text-white ${
                  updating ? "cursor-not-allowed opacity-70" : ""
                }`}
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
