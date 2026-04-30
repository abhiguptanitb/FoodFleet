import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiCreditCard, FiPhone, FiShield, FiTruck } from "react-icons/fi";
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

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ead8cb] bg-white shadow-[0_14px_34px_rgba(88,58,37,0.08)]">
      <div className="relative h-52 overflow-hidden bg-[#f4e8df]">
        {rider.picture ? (
          <img
            src={rider.picture}
            className="h-full w-full object-cover"
            alt={rider.phoneNumber || "Rider"}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#c1a28c]">
            <FiTruck size={34} />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5d52]">
            Rider
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              rider.isVerified
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {rider.isVerified ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-semibold text-[#1f1a17]">
            {rider.user?.name || rider.phoneNumber || rider.phone || "Rider Profile"}
          </h3>
          <p className="mt-1 text-sm text-[#8a7464]">
            {rider.user?.email ||
              "Delivery partner details available for manual verification."}
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
            <FiPhone className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                Phone Number
              </p>
              <p className="mt-1 break-words text-sm text-[#3f332c]">
                {rider.phoneNumber || rider.phone || "Not available"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
            <FiCreditCard className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
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
                {rider.isVerified ? "Verified" : "Unverified"}
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
    </article>
  );
};

export default RiderAdmin;
