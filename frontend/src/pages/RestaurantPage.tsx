import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import { SkeletonState } from "../components/LoadingState";

const RestaurantPage = () => {
  const { id } = useParams();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState("");
  const [category, setCategory] = useState("all");

  const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurant(data || null);
    } catch {
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setMenuItems(data);
    } catch {
      setMenuItems([]);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [id]);

  if (loading) {
    return <SkeletonState type="menu" title="Restaurant menu" />;
  }

  if (!restaurant) {
    return (
      <div className="page-wrap flex h-[60vh] items-center justify-center">
        <div className="glass-card px-6 py-10 text-center">
          <h1 className="text-2xl font-semibold text-[#1f1a17]">
            Restaurant not found
          </h1>
          <p className="section-copy mt-3 text-sm">
            This restaurant may have been removed or the link may be incorrect.
          </p>
        </div>
      </div>
    );
  }

  const getCategory = (item: IMenuItem) => item.category || "Popular";
  const categories = Array.from(new Set(menuItems.map(getCategory)));
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch = `${item.name} ${item.description || ""}`
      .toLowerCase()
      .includes(menuSearch.toLowerCase());
    const matchesCategory = category === "all" || getCategory(item) === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page-wrap min-h-screen space-y-6 py-6">
      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={false}
      />

      <div className="soft-card fade-up p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="pill-label">Menu</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#1f1a17]">
              Browse the full menu
            </h2>
          </div>
          <p className="text-sm text-[var(--text-soft)]">
            Choose from the latest available dishes and add them straight to your cart.
          </p>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            className="field-input py-3 text-sm"
            placeholder="Search this menu"
          />
          <div className="mobile-tabs md:w-auto">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                category === "all"
                  ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                  : "text-[var(--text-soft)]"
              }`}
            >
              All
            </button>
            {categories.map((currentCategory) => (
              <button
                key={currentCategory}
                type="button"
                onClick={() => setCategory(currentCategory)}
                className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                  category === currentCategory
                    ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                    : "text-[var(--text-soft)]"
                }`}
              >
                {currentCategory}
              </button>
            ))}
          </div>
        </div>
        <MenuItems
          isSeller={false}
          items={filteredMenuItems}
          onItemDeleted={() => {}}
        />
      </div>
    </div>
  );
};

export default RestaurantPage;
