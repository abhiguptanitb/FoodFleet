import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import LoadingState from "../components/LoadingState";

const RestaurantPage = () => {
  const { id } = useParams();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.log(error);
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
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [id]);

  if (loading) {
    return (
      <LoadingState
        eyebrow="Restaurant"
        title="Setting the table"
        copy="We are loading the profile, live menu, and current availability."
      />
    );
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
          <p className="text-sm text-[#6d5d52]">
            Choose from the latest available dishes and add them straight to your cart.
          </p>
        </div>
        <MenuItems
          isSeller={false}
          items={menuItems}
          onItemDeleted={() => {}}
        />
      </div>
    </div>
  );
};

export default RestaurantPage;
