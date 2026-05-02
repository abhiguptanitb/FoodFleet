import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";
import LoadingState from "../components/LoadingState";

const Home = () => {
  const { location } = useAppData();
  const [searchParams] = useSearchParams();

  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

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
            search,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [location, search]);

  if (loading || !location) {
    return (
      <LoadingState
        eyebrow="Nearby Picks"
        title="Finding kitchens around you"
        copy="We are matching your delivery area with restaurants that can reach you now."
      />
    );
  }
  return (
    <div className="page-wrap space-y-6 py-6">
      <section className="hero-panel fade-up px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="pill-label">Nearby Picks</p>
            <h1 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">
              {search ? `Results for "${search}"` : "Fresh meals around your area"}
            </h1>
            <p className="section-copy mt-2 max-w-2xl text-sm">
              Browse live restaurant listings, check availability instantly, and
              order from places that can reach your selected location.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border-2 border-[var(--text)] bg-white px-4 py-2 text-sm text-[#6d5d52] shadow-[4px_4px_0_var(--accent-2)]">
            <span className="font-semibold text-[#1f1a17]">{restaurants.length}</span>{" "}
            restaurant{restaurants.length === 1 ? "" : "s"} available
          </div>
        </div>
      </section>

      {restaurants.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((res) => {
            return (
              <RestaurantCard
                key={res._id}
                id={res._id}
                name={res.name}
                image={res.image ?? ""}
                isOpen={res.isOpen}
              />
            );
          })}
        </div>
      ) : (
        <div className="glass-card px-6 py-14 text-center">
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
