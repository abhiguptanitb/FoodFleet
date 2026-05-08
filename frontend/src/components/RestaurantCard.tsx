import { useNavigate } from "react-router-dom";

type props = {
  id: string;
  image: string;
  name: string;
  isOpen: boolean;
};

const RestaurantCard = ({ id, image, name, isOpen }: props) => {
  const navigate = useNavigate();
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
            Food delivery
          </span>
          <span
            className={`status-badge ${
              isOpen
                ? "status-badge-success"
                : "status-badge-danger"
            }`}
          >
            {isOpen ? "Open Now" : "Closed"}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-lg font-semibold text-[#1f1a17]">
            {name}
          </h3>
          <span className="status-badge">
            Fast order
          </span>
        </div>
        <p className="text-sm leading-6 text-[#506277]">
          {isOpen
            ? "Ordering is live. Tap to explore the menu and place your order."
            : "This restaurant is currently closed. You can still preview the menu."}
        </p>
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
