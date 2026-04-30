import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiMapPin, FiPhone, FiShield, FiShoppingBag } from "react-icons/fi";
import { adminService } from "../main";

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

const AdminRestaurantCard = ({
  restaurant,
  onStatusChange,
}: {
  restaurant: AdminRestaurant;
  onStatusChange: (restaurantId: string, isVerified: boolean) => void;
}) => {
  const [updating, setUpdating] = useState(false);

  const toggleVerification = async () => {
    const nextStatus = !restaurant.isVerified;

    try {
      setUpdating(true);
      await axios.patch(
        `${adminService}/api/v1/verify/restaurant/${restaurant._id}`,
        { isVerified: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(
        `Restaurant ${nextStatus ? "verified" : "marked unverified"}`
      );
      onStatusChange(restaurant._id, nextStatus);
    } catch (error) {
      toast.error("Failed to update restaurant status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ead8cb] bg-white shadow-[0_14px_34px_rgba(88,58,37,0.08)]">
      <div className="relative h-52 overflow-hidden bg-[#f4e8df]">
        {restaurant.image ? (
          <img
            src={restaurant.image}
            className="h-full w-full object-cover"
            alt={restaurant.name}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#c1a28c]">
            <FiShoppingBag size={34} />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5d52]">
            Restaurant
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              restaurant.isVerified
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {restaurant.isVerified ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-semibold text-[#1f1a17]">
            {restaurant.name}
          </h3>
          <p className="mt-1 text-sm text-[#8a7464]">
            Outlet ready for admin review and status control.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
            <FiPhone className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                Contact Number
              </p>
              <p className="mt-1 break-words text-sm text-[#3f332c]">
                {restaurant.phone || "Not available"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#faf6f2] p-3">
            <FiMapPin className="mt-0.5 shrink-0 text-[#e4572e]" size={16} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a57f65]">
                Address
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-[#3f332c]">
                {restaurant.autoLocation?.formattedAddress || "Location unavailable"}
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
                  restaurant.isVerified ? "text-green-700" : "text-amber-700"
                }`}
              >
                {restaurant.isVerified ? "Verified" : "Unverified"}
              </p>
            </div>
          </div>
        </div>

        <button
          disabled={updating}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition ${
            restaurant.isVerified
              ? "bg-amber-500 hover:bg-amber-600"
              : "bg-[#1f9d64] hover:bg-[#168352]"
          } ${updating ? "cursor-not-allowed opacity-70" : ""}`}
          onClick={toggleVerification}
        >
          <FiShield size={16} />
          {updating
            ? "Updating Status..."
            : restaurant.isVerified
            ? "Mark as Unverified"
            : "Verify Restaurant"}
        </button>
      </div>
    </article>
  );
};

export default AdminRestaurantCard;
