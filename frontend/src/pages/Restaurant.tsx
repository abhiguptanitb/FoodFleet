import { useEffect, useMemo, useState } from "react";
import type { IMenuItem, IOrder, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import AddRestaurant from "../components/AddRestaurant";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";
import {
  FiEdit3,
  FiBarChart2,
  FiGrid,
  FiMapPin,
  FiPlus,
  FiPlusCircle,
  FiSave,
  FiShoppingBag,
  FiX,
} from "react-icons/fi";
import { BiUpload } from "react-icons/bi";
import toast from "react-hot-toast";
import LoadingState from "../components/LoadingState";

type SellerTab = "menu" | "add-item" | "sales";

const ACTIVE_RESTAURANT_STORAGE_KEY = "sellerActiveRestaurantId";

const Restaurant = () => {
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [, setRestaurantOrders] = useState<IOrder[]>([]);
  const [togglingRestaurantId, setTogglingRestaurantId] = useState<string | null>(
    null
  );
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [salesStats, setSalesStats] = useState({
    revenue: 0,
    totalOrdersDelivered: 0,
    topItem: { name: "No sales yet", quantity: 0 },
  });

  const selectedRestaurant =
    restaurants.find((restaurant) => restaurant._id === selectedRestaurantId) ||
    null;

  const fetchSalesStats = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/stats/sales/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (data.success && data.stats) {
        setSalesStats({
          revenue: data.stats.revenue,
          totalOrdersDelivered: data.stats.totalOrdersDelivered,
          topItem: data.stats.topItem || {
            name: "No sales yet",
            quantity: 0,
          },
        });
      }
    } catch (error) {
      console.log("Error fetching sales stats:", error);
      // Keep existing stats on error
    }
  };

  const editingRestaurant = useMemo(
    () =>
      restaurants.find((restaurant) => restaurant._id === editingRestaurantId) ||
      null,
    [restaurants, editingRestaurantId]
  );

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/mine`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const sellerRestaurants: IRestaurant[] = data.restaurants || [];
      setRestaurants(sellerRestaurants);

      const savedRestaurantId = localStorage.getItem(
        ACTIVE_RESTAURANT_STORAGE_KEY
      );
      const nextRestaurant =
        sellerRestaurants.find(
          (restaurant) => restaurant._id === selectedRestaurantId
        ) ||
        sellerRestaurants.find(
          (restaurant) => restaurant._id === savedRestaurantId
        ) ||
        sellerRestaurants[0];

      if (nextRestaurant) {
        setSelectedRestaurantId(nextRestaurant._id);
        localStorage.setItem(
          ACTIVE_RESTAURANT_STORAGE_KEY,
          nextRestaurant._id
        );
        setShowAddRestaurant(false);
      } else {
        setSelectedRestaurantId("");
        setShowAddRestaurant(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${restaurantId}`,
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
    fetchMyRestaurant();
  }, []);

  useEffect(() => {
    if (!selectedRestaurant?._id) {
      setMenuItems([]);
      setRestaurantOrders([]);
      setSalesStats({
        revenue: 0,
        totalOrdersDelivered: 0,
        topItem: { name: "No sales yet", quantity: 0 },
      });
      return;
    }

    fetchMenuItems(selectedRestaurant._id);
    fetchSalesStats(selectedRestaurant._id);
    setRestaurantOrders([]);
    localStorage.setItem(
      ACTIVE_RESTAURANT_STORAGE_KEY,
      selectedRestaurant._id
    );
  }, [selectedRestaurantId]);

  const updateRestaurantInState = (updatedRestaurant: IRestaurant) => {
    setRestaurants((currentRestaurants) =>
      currentRestaurants.map((restaurant) =>
        restaurant._id === updatedRestaurant._id ? updatedRestaurant : restaurant
      )
    );
  };

  const openEditModal = (restaurant: IRestaurant) => {
    setEditingRestaurantId(restaurant._id);
    setEditName(restaurant.name);
    setEditDescription(restaurant.description || "");
    setEditImage(null);
  };

  const closeEditModal = () => {
    setEditingRestaurantId(null);
    setEditName("");
    setEditDescription("");
    setEditImage(null);
  };

  const saveRestaurantChanges = async () => {
    if (!editingRestaurant) return;

    try {
      setSavingRestaurant(true);
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("restaurantId", editingRestaurant._id);

      if (editImage) {
        formData.append("file", editImage);
      }

      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/edit`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      updateRestaurantInState(data.restaurant);
      toast.success(data.message);
      closeEditModal();
    } catch (error) {
      console.log(error);
      toast.error("Failed to update restaurant");
    } finally {
      setSavingRestaurant(false);
    }
  };

  const toggleRestaurantStatus = async (restaurant: IRestaurant) => {
    try {
      setTogglingRestaurantId(restaurant._id);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/status`,
        {
          status: !restaurant.isOpen,
          restaurantId: restaurant._id,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      updateRestaurantInState(data.restaurant);
      toast.success(data.message);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setTogglingRestaurantId(null);
    }
  };

  if (loading) {
    return (
      <LoadingState
        eyebrow="Partner Workspace"
        title="Loading your outlets"
        copy="We are preparing restaurant profiles, menus, sales, and live orders."
      />
    );
  }

  return (
    <div className="role-page px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[8px_8px_0_var(--text)]">
          <div className="bg-[radial-gradient(circle_at_top_left,_var(--role-glow),_transparent_34%),linear-gradient(135deg,#ffffff_0%,var(--accent-soft)_58%)] p-4 sm:p-6">
            <div className="space-y-6">
              <div className="-mx-4 overflow-x-auto px-4 pb-2">
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <p className="text-sm font-semibold text-[#1f1a17]">
                    Your Restaurants
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#a27558]">
                    {restaurants.length} total
                  </span>
                </div>

                <div className="flex min-w-max gap-4">
                  {restaurants.map((restaurant) => {
                    const isActive = restaurant._id === selectedRestaurantId;

                    return (
                      <div
                        key={restaurant._id}
                        className={`w-[284px] shrink-0 overflow-hidden rounded-[28px] border bg-white transition ${
                          isActive
                            ? "border-[var(--accent)] shadow-[6px_6px_0_var(--text)]"
                            : "border-[#11182733] shadow-[4px_4px_0_rgba(17,24,39,0.1)]"
                        }`}
                      >
                        <div className="relative h-40 overflow-hidden bg-[#f4e8df]">
                          {restaurant.image ? (
                            <img
                              src={restaurant.image}
                              alt={restaurant.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#c1a28c]">
                              <FiShoppingBag size={28} />
                            </div>
                          )}

                          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#4f3f34]">
                              {restaurant.isOpen ? "Open" : "Closed"}
                            </span>
                            {isActive && (
                              <span className="rounded-full border border-[var(--text)] bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                Active
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() =>
                                setSelectedRestaurantId(restaurant._id)
                              }
                              className="min-w-0 flex-1 text-left"
                            >
                              <h2 className="line-clamp-1 text-lg font-semibold text-[#1f1a17]">
                                {restaurant.name}
                              </h2>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(restaurant)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ecd6c7] text-[#6a5548] transition hover:border-[#e4572e] hover:text-[#e4572e]"
                            >
                              <FiEdit3 size={16} />
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              setSelectedRestaurantId(restaurant._id)
                            }
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-2 rounded-2xl bg-[#faf6f2] p-3 text-sm text-[#6a5b50]">
                              <FiMapPin className="mt-0.5 shrink-0 text-[#e4572e]" />
                              <p className="line-clamp-3">
                                {restaurant.autoLocation?.formattedAddress ||
                                  "Location unavailable"}
                              </p>
                            </div>
                          </button>
                        </div>

                        <div className="flex gap-3 border-t border-[#f0e4db] px-4 py-4">
                          <button
                            onClick={() => setSelectedRestaurantId(restaurant._id)}
                            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? "bg-[#1f1a17] text-white"
                                : "bg-[#fff5ee] text-[#7a5a47] hover:bg-[#ffede1]"
                            }`}
                          >
                            {isActive ? "Selected" : "Select"}
                          </button>
                          <button
                            onClick={() => toggleRestaurantStatus(restaurant)}
                            disabled={togglingRestaurantId === restaurant._id}
                            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                              restaurant.isOpen
                                ? "bg-[#1f1a17] hover:bg-[#342a24]"
                                : "bg-[#1f9d64] hover:bg-[#168352]"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {togglingRestaurantId === restaurant._id
                              ? "Updating..."
                              : restaurant.isOpen
                              ? "Close Now"
                              : "Open Now"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() =>
                      setShowAddRestaurant((currentValue) => !currentValue)
                    }
                    className="flex w-[250px] shrink-0 flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[var(--text)] bg-white px-6 py-8 text-center shadow-[5px_5px_0_var(--accent-2)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <FiPlus size={24} />
                    </div>
                    <p className="mt-4 text-base font-semibold text-[#1f1a17]">
                      Add Another Restaurant
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#6d5d52]">
                      Create a new outlet directly from this row.
                    </p>
                  </button>
                </div>
              </div>

              {/* Add Restaurant Modal is rendered below, outside the section */}
            </div>
          </div>
        </section>

        {selectedRestaurant && (
          <RestaurantOrders
            restaurantId={selectedRestaurant._id}
            onOrdersChange={setRestaurantOrders}
          />
        )}

        {selectedRestaurant && (
          <div className="overflow-hidden rounded-[28px] border-2 border-[var(--text)] bg-white shadow-[8px_8px_0_var(--text)]">
            <div className="flex flex-col gap-4 border-b-2 border-[var(--text)] bg-[var(--accent-soft)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                  Restaurant Tools
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#1f1a17]">
                  {selectedRestaurant.name}
                </h2>
              </div>

              <div className="inline-grid grid-cols-3 rounded-2xl border-2 border-[var(--text)] bg-white p-1 shadow-[4px_4px_0_var(--accent-2)]">
              {[
                { key: "menu", label: "Menu", icon: FiGrid },
                { key: "add-item", label: "Add", icon: FiPlusCircle },
                { key: "sales", label: "Sales", icon: FiBarChart2 },
              ].map((currentTab) => (
                  <button
                    key={currentTab.key}
                    onClick={() => setTab(currentTab.key as SellerTab)}
                    className={`inline-flex min-w-20 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:min-w-28 ${
                      tab === currentTab.key
                        ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                        : "text-[#4f5d68] hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
                    }`}
                  >
                    <currentTab.icon size={16} />
                    <span>{currentTab.label}</span>
                  </button>
              ))}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {tab === "menu" && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--accent)]">
                        {menuItems.length} items listed
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold text-[#1f1a17]">
                        Manage menu availability
                      </h3>
                    </div>
                    <button
                      onClick={() => setTab("add-item")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1f1a17] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#342a24]"
                    >
                      <FiPlusCircle size={16} />
                      Add Item
                    </button>
                  </div>

                  <MenuItems
                    items={menuItems}
                    onItemDeleted={() => fetchMenuItems(selectedRestaurant._id)}
                    isSeller={true}
                  />
                </div>
              )}
              {tab === "add-item" && (
                <AddMenuItem
                  restaurantId={selectedRestaurant._id}
                  onItemAdded={() => fetchMenuItems(selectedRestaurant._id)}
                />
              )}
              {tab === "sales" && (
                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-3xl border border-[#efdfd2] bg-[#fffaf7] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b48668]">
                      Sales
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-[#1f1a17]">
                      Insights are ready to plug in
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#6d5d52]">
                      Use this panel for daily revenue, best sellers, order
                      volume, and payout snapshots.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        label: "Revenue",
                        value: `Rs ${salesStats.revenue.toFixed(2)}`,
                        detail: "From delivered paid orders",
                        tone: "text-[#e4572e]",
                      },
                      {
                        label: "Orders",
                        value: String(salesStats.totalOrdersDelivered),
                        detail: "Delivered orders counted",
                        tone: "text-sky-600",
                      },
                      {
                        label: "Top Item",
                        value: salesStats.topItem.name,
                        detail: salesStats.topItem.quantity
                          ? `${salesStats.topItem.quantity} sold`
                          : "No delivered item sales yet",
                        tone: "text-emerald-600",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-3xl border border-[#efdfd2] bg-white p-5 shadow-[0_14px_28px_rgba(86,57,35,0.06)]"
                      >
                        <p className="text-sm font-semibold text-[#6d5d52]">
                          {item.label}
                        </p>
                        <p className={`mt-4 text-2xl font-semibold ${item.tone}`}>
                          {item.value}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#8a7464]">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-[0_22px_60px_rgba(0,0,0,0.25)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e4572e]">
                  Edit Restaurant
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1f1a17]">
                  {editingRestaurant.name}
                </h2>
              </div>
              <button
                onClick={closeEditModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ecd6c7] text-[#6a5548] transition hover:border-[#e4572e] hover:text-[#e4572e]"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f3f34]">
                  Restaurant Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-base text-[#1f1a17] outline-none transition focus:border-[#e4572e]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f3f34]">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-sm text-[#3a2d25] outline-none transition focus:border-[#e4572e]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] p-4 text-sm text-gray-600 hover:bg-[#fff4ec]">
                <BiUpload className="h-5 w-5 text-[#e4572e]" />
                {editImage ? editImage.name : "Upload new restaurant image (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                />
              </label>

              <div className="flex items-start gap-2 rounded-2xl bg-[#faf6f2] p-4 text-sm text-[#6a5b50]">
                <FiMapPin className="mt-0.5 shrink-0 text-[#e4572e]" />
                <p>
                  {editingRestaurant.autoLocation?.formattedAddress ||
                    "Location unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeEditModal}
                className="rounded-2xl border border-[#ecd6c7] px-4 py-3 text-sm font-semibold text-[#6a5548] transition hover:border-[#e4572e] hover:text-[#e4572e]"
              >
                Cancel
              </button>
              <button
                onClick={saveRestaurantChanges}
                disabled={savingRestaurant}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e4572e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#cb4720] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSave size={16} />
                {savingRestaurant ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Restaurant Modal */}
      {showAddRestaurant && (
        <AddRestaurant
          fetchMyRestaurant={fetchMyRestaurant}
          hasExistingRestaurants={restaurants.length > 0}
          onCancel={() => setShowAddRestaurant(false)}
        />
      )}
    </div>
  );
};

export default Restaurant;
