import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";
import { SkeletonState } from "../components/LoadingState";
import toast from "react-hot-toast";
import { FiSearch, FiX, FiZap } from "react-icons/fi";
import {
  generateSmartFoodSearch,
  type SmartFoodSearchResult,
} from "../utils/aiDescription";

const CUISINE_OPTIONS = ["Pizza", "Biryani", "Burger", "Chinese", "South Indian"];

const getCuisine = (restaurant: IRestaurant) => {
  const text = `${restaurant.name} ${restaurant.description || ""}`.toLowerCase();
  const match = CUISINE_OPTIONS.find((cuisine) =>
    text.includes(cuisine.toLowerCase())
  );

  return restaurant.cuisine || match || "Mixed";
};

const getDeliveryTime = (restaurant: IRestaurant) =>
  restaurant.deliveryTimeMinutes ||
  Math.max(18, Math.round((restaurant.distanceKm || 2) * 8 + 16));

const getPriceRange = (restaurant: IRestaurant) => {
  if (restaurant.priceRange) return restaurant.priceRange;
  const text = `${restaurant.name} ${restaurant.description || ""}`.toLowerCase();
  if (text.includes("premium") || text.includes("royal")) return "premium";
  if (text.includes("cafe") || text.includes("express")) return "budget";
  return "mid";
};

const Home = () => {
  const { location } = useAppData();
  const [searchParams] = useSearchParams();

  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [smartQuery, setSmartQuery] = useState("");
  const [smartSearch, setSmartSearch] = useState<SmartFoodSearchResult | null>(
    null
  );
  const [smartLoading, setSmartLoading] = useState(false);
  const [cuisine, setCuisine] = useState("all");
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState("all");
  const [deliveryTime, setDeliveryTime] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("favoriteRestaurants") || "[]");
    } catch {
      return [];
    }
  });
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const effectiveSearch = smartSearch?.searchText || search;

  const fetchRestaurants = async () => {
    if (!location?.latitude || !location?.longitude) {
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            search: effectiveSearch,
            cuisine,
            openNow,
            minRating,
            maxDeliveryTime: deliveryTime,
            priceRange,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [
    location,
    effectiveSearch,
    cuisine,
    openNow,
    minRating,
    deliveryTime,
    priceRange,
  ]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data } = await axios.get(
          `${restaurantService}/api/restaurant/favorites/list`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setFavoriteIds(data.restaurantIds || []);
        localStorage.setItem(
          "favoriteRestaurants",
          JSON.stringify(data.restaurantIds || [])
        );
      } catch (error) {
      }
    };

    fetchFavorites();
  }, []);

  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (openNow && !restaurant.isOpen) return false;
    if (cuisine !== "all" && getCuisine(restaurant) !== cuisine) return false;
    if (minRating !== "all" && (restaurant.rating || 4.1) < Number(minRating)) {
      return false;
    }
    if (
      deliveryTime !== "all" &&
      getDeliveryTime(restaurant) > Number(deliveryTime)
    ) {
      return false;
    }
    if (priceRange !== "all" && getPriceRange(restaurant) !== priceRange) {
      return false;
    }
    if (favoritesOnly && !favoriteIds.includes(restaurant._id)) return false;
    return true;
  });

  const cuisineFilters = Array.from(
    new Set(restaurants.map((restaurant) => getCuisine(restaurant)))
  );

  const handleSmartSearch = async () => {
    const query = smartQuery.trim();
    if (!query) {
      toast.error("Tell AI what you feel like eating");
      return;
    }

    try {
      setSmartLoading(true);
      const result = await generateSmartFoodSearch(query);
      setSmartSearch(result);
      setCuisine(
        result.cuisine !== "all" && cuisineFilters.includes(result.cuisine)
          ? result.cuisine
          : "all"
      );
      setPriceRange(result.priceRange || "all");
      setDeliveryTime(result.maxDeliveryTime || "all");
      setMinRating(result.minRating || "all");
      setOpenNow(Boolean(result.openNow));
      toast.success("Smart filters applied");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to run smart food search"
      );
    } finally {
      setSmartLoading(false);
    }
  };

  const clearSmartSearch = () => {
    setSmartSearch(null);
    setSmartQuery("");
    setCuisine("all");
    setOpenNow(false);
    setMinRating("all");
    setDeliveryTime("all");
    setPriceRange("all");
  };

  if (loading || !location) {
    return <SkeletonState type="restaurants" title="Nearby restaurants" />;
  }

  const toggleFavorite = (restaurantId: string) => {
    const wasFavorite = favoriteIds.includes(restaurantId);
    setFavoriteIds((current) => {
      const next = current.includes(restaurantId)
        ? current.filter((id) => id !== restaurantId)
        : [...current, restaurantId];
      localStorage.setItem("favoriteRestaurants", JSON.stringify(next));
      return next;
    });
    const request = wasFavorite
      ? axios.delete(`${restaurantService}/api/restaurant/favorites/${restaurantId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      : axios.post(
          `${restaurantService}/api/restaurant/favorites`,
          { restaurantId },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

    request.catch(() => {
      setFavoriteIds((current) => {
        const rollback = wasFavorite
          ? [...current, restaurantId]
          : current.filter((id) => id !== restaurantId);
        localStorage.setItem("favoriteRestaurants", JSON.stringify(rollback));
        return rollback;
      });
    });
  };

  return (
    <div className="page-wrap space-y-6 py-6">
      <section className="hero-panel fade-up px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="pill-label">Nearby Picks</p>
            <h1 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">
              {effectiveSearch
                ? `Results for "${effectiveSearch}"`
                : "Fresh meals around your area"}
            </h1>
            <p className="section-copy mt-2 max-w-2xl text-sm">
              Browse live restaurant listings, check availability instantly, and
              order from places that can reach your selected location.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border-2 border-[var(--text)] bg-white px-4 py-2 text-sm text-[var(--text-soft)] shadow-[4px_4px_0_var(--accent-2)]">
            <span className="font-semibold text-[#1f1a17]">{filteredRestaurants.length}</span>{" "}
            restaurant{filteredRestaurants.length === 1 ? "" : "s"} shown
          </div>
        </div>
      </section>

      <section className="ui-card p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[var(--text)] bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]">
                <FiZap size={15} />
              </span>
              <label className="text-sm font-black text-[var(--text)]">
                Smart Food Search
              </label>
            </div>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
              <input
                value={smartQuery}
                onChange={(event) => setSmartQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSmartSearch();
                  }
                }}
                className="field-input bg-white py-3 pl-12 pr-4 text-sm"
                style={{ paddingLeft: "3.25rem" }}
                placeholder="Try: cheap spicy dinner, fast biryani, top rated pizza"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {smartSearch && (
              <button
                type="button"
                onClick={clearSmartSearch}
                className="action-button px-4 py-3 text-sm"
              >
                <FiX size={16} />
                Clear AI
              </button>
            )}
            <button
              type="button"
              onClick={handleSmartSearch}
              disabled={smartLoading}
              className="brand-button min-h-12 px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiZap size={16} />
              {smartLoading ? "Thinking..." : "Apply AI Search"}
            </button>
          </div>
        </div>

        {smartSearch && (
          <div className="mt-4 rounded-2xl border-2 border-[color-mix(in_srgb,var(--accent)_24%,white)] bg-[var(--accent-soft)] p-4">
            <p className="text-sm font-semibold leading-6 text-[var(--text)]">
              {smartSearch.explanation}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                smartSearch.cuisine !== "all" && smartSearch.cuisine,
                smartSearch.priceRange !== "all" && smartSearch.priceRange,
                smartSearch.maxDeliveryTime !== "all" &&
                  `under ${smartSearch.maxDeliveryTime} min`,
                smartSearch.minRating !== "all" &&
                  `${smartSearch.minRating}+ rating`,
                smartSearch.openNow && "open now",
                ...smartSearch.keywords,
              ]
                .filter(Boolean)
                .map((tag) => (
                  <span key={String(tag)} className="status-badge bg-white">
                    {String(tag)}
                  </span>
                ))}
            </div>
          </div>
        )}
      </section>

      <section className="ui-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={cuisine}
            onChange={(event) => setCuisine(event.target.value)}
            className="field-input py-3 text-sm"
          >
            <option value="all">All cuisines</option>
            {cuisineFilters.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="field-input py-3 text-sm"
          >
            <option value="all">Any rating</option>
            <option value="4">4.0+ rating</option>
            <option value="4.3">4.3+ rating</option>
            <option value="4.5">4.5+ rating</option>
          </select>
          <select
            value={deliveryTime}
            onChange={(event) => setDeliveryTime(event.target.value)}
            className="field-input py-3 text-sm"
          >
            <option value="all">Any delivery time</option>
            <option value="25">Under 25 min</option>
            <option value="35">Under 35 min</option>
            <option value="45">Under 45 min</option>
          </select>
          <select
            value={priceRange}
            onChange={(event) => setPriceRange(event.target.value)}
            className="field-input py-3 text-sm"
          >
            <option value="all">Any price</option>
            <option value="budget">Budget</option>
            <option value="mid">Mid range</option>
            <option value="premium">Premium</option>
          </select>
          <label className="action-button cursor-pointer px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(event) => setOpenNow(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Open now
          </label>
          <label className="action-button cursor-pointer px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Saved
          </label>
        </div>
      </section>

      {filteredRestaurants.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRestaurants.map((res) => {
            return (
              <RestaurantCard
                key={res._id}
                id={res._id}
                name={res.name}
                image={res.image ?? ""}
                isOpen={res.isOpen}
                cuisine={getCuisine(res)}
                rating={res.rating || 4.1}
                deliveryTime={getDeliveryTime(res)}
                priceRange={getPriceRange(res)}
                isFavorite={favoriteIds.includes(res._id)}
                onToggleFavorite={() => toggleFavorite(res._id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2 className="text-2xl font-semibold text-[#1f1a17]">
            No restaurants matched this search
          </h2>
          <p className="section-copy mt-3 text-sm">
            Try a different cuisine, update your location, or search with a broader term.
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
