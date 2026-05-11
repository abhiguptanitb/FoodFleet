import { useNavigate } from "react-router-dom";
import { FiClock, FiHeart, FiTrendingUp } from "react-icons/fi";

type props = {
  id: string;
  image: string;
  name: string;
  isOpen: boolean;
  cuisine?: string;
  rating?: number;
  deliveryTime?: number;
  priceRange?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

const RestaurantCard = ({
  id,
  image,
  name,
  isOpen,
  cuisine = "Mixed",
  rating = 4.1,
  deliveryTime = 30,
  priceRange = "mid",
  isFavorite = false,
  onToggleFavorite,
}: props) => {
  const navigate = useNavigate();
  const priceLabel =
    priceRange === "premium"
      ? "Premium"
      : priceRange === "budget"
        ? "Budget"
        : "Mid-range";
  const priceTone =
    priceRange === "premium"
      ? "from-[#fff7ed] to-[#ffe4e6] text-[#be123c]"
      : priceRange === "budget"
        ? "from-[#ecfdf5] to-[#dcfce7] text-[#047857]"
        : "from-[#eff6ff] to-[#eef2ff] text-[#2563eb]";

  return (
    <div
      className={`ui-card group fade-up cursor-pointer overflow-hidden p-0 transition hover:-translate-y-1 hover:border-[var(--accent)] ${
        !isOpen ? "opacity-80" : ""
      }`}
      onClick={() => navigate(`/restaurant/${id}`)}
    >
      <div className="relative h-52 w-full overflow-hidden bg-[#e0f2fe]">
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-110 ${
            !isOpen ? "grayscale" : ""
          }`}
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#334155] backdrop-blur">
            {cuisine}
          </span>
          <span
            className={`status-badge ${
              isOpen ? "status-badge-success" : "status-badge-danger"
            }`}
          >
            {isOpen ? "Open Now" : "Closed"}
          </span>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className={`absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[var(--text)] bg-white shadow-[4px_4px_0_var(--text)] ${
              isFavorite ? "text-red-500" : "text-[var(--text)]"
            }`}
            aria-label={isFavorite ? "Remove from favorites" : "Save restaurant"}
          >
            <FiHeart className={isFavorite ? "fill-current" : ""} size={18} />
          </button>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-lg font-semibold text-[#1f1a17]">
            {name}
          </h3>
          <span className="status-badge">{rating.toFixed(1)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-gradient-to-br from-[#eef8ff] to-white px-3 py-2 text-xs font-black text-[#0369a1] shadow-[3px_3px_0_color-mix(in_srgb,var(--accent)_16%,transparent)]">
            <FiClock className="shrink-0" size={15} />
            {deliveryTime} min
          </span>
          <span
            className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-gradient-to-br px-3 py-2 text-xs font-black shadow-[3px_3px_0_color-mix(in_srgb,var(--accent-3)_18%,transparent)] ${priceTone}`}
          >
            <FiTrendingUp className="shrink-0" size={15} />
            {priceLabel}
          </span>
        </div>

        <p
          className={`text-sm font-semibold ${
            isOpen ? "text-[#198754]" : "text-[#cc4b37]"
          }`}
        >
          {isOpen ? "Accepting orders right now" : "Currently unavailable"}
        </p>
        <div className="flex items-center justify-between border-t border-[#d8e3ef] pt-3">
          <span className="text-sm font-medium text-[#1f1a17]">
            View restaurant
          </span>
          <span className="text-sm text-[#2563eb] transition group-hover:translate-x-1">
            Explore
          </span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
