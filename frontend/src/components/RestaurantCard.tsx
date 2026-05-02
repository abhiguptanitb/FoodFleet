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
      className={`group fade-up cursor-pointer overflow-hidden rounded-[28px] border border-[#ecdccf] bg-white shadow-[0_18px_36px_rgba(84,56,35,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(84,56,35,0.14)] ${
        !isOpen ? "opacity-80" : ""
      }`}
      onClick={() => navigate(`/restaurant/${id}`)}
    >
      <div className="relative h-52 w-full overflow-hidden bg-[#f6e7db]">
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-110 ${
            !isOpen ? "grayscale" : ""
          }`}
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5d4a3f] backdrop-blur">
            Food delivery
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isOpen
                ? "bg-[#eaf8f1] text-[#198754]"
                : "bg-black/70 text-white"
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
          <span className="rounded-full bg-[#fff2e9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e4572e]">
            Fast order
          </span>
        </div>
        <p className="text-sm leading-6 text-[#6d5d52]">
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
        <div className="flex items-center justify-between border-t border-[#f1e6dd] pt-3">
          <span className="text-sm font-medium text-[#1f1a17]">
            View restaurant
          </span>
          <span className="text-sm text-[#e4572e] transition group-hover:translate-x-1">
            Explore
          </span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
