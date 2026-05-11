import { useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import { logoutSession } from "../utils/authSession";
import { FiClock, FiTrendingUp } from "react-icons/fi";

interface props {
  restaurant: IRestaurant;
  isSeller: boolean;
  onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: props) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [loading, setLoading] = useState(false);
  const priceLabel =
    restaurant.priceRange === "premium"
      ? "Premium pricing"
      : restaurant.priceRange === "budget"
        ? "Budget friendly"
        : "Mid-range pricing";
  const priceTone =
    restaurant.priceRange === "premium"
      ? "from-[#fff7ed] to-[#ffe4e6] text-[#be123c]"
      : restaurant.priceRange === "budget"
        ? "from-[#ecfdf5] to-[#dcfce7] text-[#047857]"
        : "from-[#eff6ff] to-[#eef2ff] text-[#2563eb]";
  const deliveryTime = restaurant.deliveryTimeMinutes || 30;

  const toggleOpenStatus = async () => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/status`,
        { status: !isOpen, restaurantId: restaurant._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      setIsOpen(data.restaurant.isOpen);
    } catch (error: any) {
      toast.error(error.response.data.message);
    }
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/edit`,
        { name, description, restaurantId: restaurant._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      onUpdate(data.restaurant);
      setEditMode(false);
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const { setIsAuth, setUser } = useAppData();

  const logoutHandler = async () => {
    await axios.put(
      `${restaurantService}/api/restaurant/status`,
      { status: false, restaurantId: restaurant._id },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    await logoutSession();
    setIsAuth(false);
    setUser(null);
    toast.success("loggedOut successfully");
  };
  return (
    <div className="hero-panel fade-up mx-auto max-w-5xl overflow-hidden">
      {restaurant.image && (
        <img
          src={restaurant.image}
          alt=""
          className="h-64 w-full object-cover sm:h-80"
        />
      )}
      <div className="space-y-5 p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="pill-label mb-3">
              {isOpen ? "Open Now" : "Currently Closed"}
            </p>
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input text-lg font-semibold"
              />
            ) : (
              <h2 className="text-3xl font-semibold text-[#1f1a17]">
                {restaurant.name}
              </h2>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-soft)]">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#eaf7f0] px-3 py-1 text-xs font-semibold text-[#166534]">
                  {restaurant.rating?.toFixed(1) ?? "4.1"} ★
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BiMapPin className="h-4 w-4 text-[var(--accent)]" />
                {restaurant.autoLocation.formattedAddress ||
                  "Location unavailable"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-gradient-to-br from-[#eef8ff] to-white px-4 py-2 text-sm font-black text-[#0369a1] shadow-[3px_3px_0_color-mix(in_srgb,var(--accent)_16%,transparent)]">
                <FiClock size={16} />
                {deliveryTime} min delivery
              </span>
              <span
                className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-gradient-to-br px-4 py-2 text-sm font-black shadow-[3px_3px_0_color-mix(in_srgb,var(--accent-3)_18%,transparent)] ${priceTone}`}
              >
                <FiTrendingUp size={16} />
                {priceLabel}
              </span>
            </div>
          </div>

          {isSeller && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-gray-500 hover:text-black"
            >
              <BiEdit size={18} />
            </button>
          )}
        </div>

        {editMode ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field-input min-h-28 text-sm"
          />
        ) : (
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            {restaurant.description ||
              "No description has been added for this restaurant yet."}
          </p>
        )}

        <div className="flex flex-col gap-4 border-t border-[#d8e3ef] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`text-sm font-semibold ${
              isOpen ? "text-[#198754]" : "text-[#cc4b37]"
            }`}
          >
            {isOpen ? "Accepting orders now" : "Temporarily unavailable"}
          </span>

          <div className="flex flex-wrap gap-3">
            {editMode && (
              <button
                onClick={saveChanges}
                disabled={loading}
                className="brand-button px-4 py-3 text-sm font-semibold"
              >
                <BiSave size={16} />
                Save Changes
              </button>
            )}

            {isSeller && (
              <button
                onClick={toggleOpenStatus}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white ${
                  isOpen
                    ? "bg-[#1f1a17] hover:bg-[#243145]"
                    : "bg-[#198754] hover:bg-[#146b43]"
                }`}
              >
                {isOpen ? "Pause Orders" : "Resume Orders"}
              </button>
            )}

            {isSeller && (
              <button
                onClick={logoutHandler}
                className="rounded-2xl bg-[#cc4b37] px-4 py-3 text-sm font-semibold text-white hover:bg-[#b73f2d]"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-[#8b786c]">
          Created on {new Date(restaurant.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default RestaurantProfile;
