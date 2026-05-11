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
  FiZap,
} from "react-icons/fi";
import { BiUpload } from "react-icons/bi";
import toast from "react-hot-toast";
import { SkeletonState } from "../components/LoadingState";
import {
  generateAiDescription,
  generateSellerPerformanceInsight,
  type SellerPerformanceInsight,
} from "../utils/aiDescription";

type SellerTab = "menu" | "add-item" | "sales";

const ACTIVE_RESTAURANT_STORAGE_KEY = "sellerActiveRestaurantId";

const Restaurant = () => {
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("all");
  const [restaurantOrders, setRestaurantOrders] = useState<IOrder[]>([]);
  const [togglingRestaurantId, setTogglingRestaurantId] = useState<string | null>(
    null
  );
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCuisine, setEditCuisine] = useState("");
  const [editDeliveryTime, setEditDeliveryTime] = useState("");
  const [editPriceRange, setEditPriceRange] = useState("mid");
  const [editRating, setEditRating] = useState("4.1");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [salesStats, setSalesStats] = useState({
    revenue: 0,
    totalOrdersDelivered: 0,
    topItem: { name: "No sales yet", quantity: 0 },
  });
  const [aiInsight, setAiInsight] = useState<SellerPerformanceInsight | null>(
    null
  );
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [performance, setPerformance] = useState<{
    chart: { label: string; revenue: number; orders: number }[];
    topItems: { name: string; quantity: number; revenue: number }[];
    lowItems: { name: string; quantity: number; revenue: number }[];
    payout: {
      grossRevenue: number;
      platformFees: number;
      riderPayouts: number;
      estimatedSellerPayout: number;
      deliveredOrders: number;
    };
  } | null>(null);

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
      const performanceResponse = await axios.get(
        `${restaurantService}/api/order/stats/performance/${restaurantId}`,
        {
          params: { range: "30d" },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setPerformance(performanceResponse.data);
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
      setAiInsight(null);
      setSalesStats({
        revenue: 0,
        totalOrdersDelivered: 0,
        topItem: { name: "No sales yet", quantity: 0 },
      });
      return;
    }

    fetchMenuItems(selectedRestaurant._id);
    fetchSalesStats(selectedRestaurant._id);
    setAiInsight(null);
    setRestaurantOrders([]);
    localStorage.setItem(
      ACTIVE_RESTAURANT_STORAGE_KEY,
      selectedRestaurant._id
    );
  }, [selectedRestaurantId]);

  const deliveredOrdersSignature = useMemo(
    () =>
      restaurantOrders
        .filter(
          (order) =>
            order.status === "delivered" && order.paymentStatus === "paid"
        )
        .map((order) => `${order._id}:${order.updatedAt}:${order.totalAmount}`)
        .join("|"),
    [restaurantOrders]
  );

  useEffect(() => {
    if (!selectedRestaurant?._id || !deliveredOrdersSignature) return;

    fetchSalesStats(selectedRestaurant._id);
  }, [selectedRestaurant?._id, deliveredOrdersSignature]);

  useEffect(() => {
    if (tab !== "sales" || !selectedRestaurant?._id) return;

    fetchSalesStats(selectedRestaurant._id);
  }, [tab, selectedRestaurant?._id]);

  const updateRestaurantInState = (updatedRestaurant: IRestaurant) => {
    setRestaurants((currentRestaurants) =>
      currentRestaurants.map((restaurant) =>
        restaurant._id === updatedRestaurant._id ? updatedRestaurant : restaurant
      )
    );
  };

  const getMenuCategory = (item: IMenuItem) => item.category || "Popular";
  const menuCategories = Array.from(new Set(menuItems.map(getMenuCategory)));
  const visibleMenuItems = menuItems.filter((item) => {
    const matchesSearch = `${item.name} ${item.description || ""}`
      .toLowerCase()
      .includes(menuSearch.toLowerCase());
    const matchesCategory =
      menuCategory === "all" || getMenuCategory(item) === menuCategory;
    return matchesSearch && matchesCategory;
  });

  const openEditModal = (restaurant: IRestaurant) => {
    setEditingRestaurantId(restaurant._id);
    setEditName(restaurant.name);
    setEditDescription(restaurant.description || "");
    setEditPhone(String(restaurant.phone || ""));
    setEditCuisine(restaurant.cuisine || "");
    setEditDeliveryTime(
      restaurant.deliveryTimeMinutes ? String(restaurant.deliveryTimeMinutes) : ""
    );
    setEditPriceRange(restaurant.priceRange || "mid");
    setEditRating(restaurant.rating ? String(restaurant.rating) : "4.1");
    setEditImage(null);
  };

  const closeEditModal = () => {
    setEditingRestaurantId(null);
    setEditName("");
    setEditDescription("");
    setEditPhone("");
    setEditCuisine("");
    setEditDeliveryTime("");
    setEditPriceRange("mid");
    setEditRating("4.1");
    setEditImage(null);
    setGeneratingDescription(false);
  };

  const handleGenerateRestaurantDescription = async () => {
    try {
      setGeneratingDescription(true);
      const generatedDescription = await generateAiDescription({
        type: "restaurant",
        name: editName,
        cuisine: editCuisine,
        category: editPriceRange,
        keywords: editDeliveryTime ? `${editDeliveryTime} minute delivery` : undefined,
        currentDescription: editDescription,
      });

      if (!generatedDescription) {
        toast.error("AI could not generate a description");
        return;
      }

      setEditDescription(generatedDescription);
      toast.success("Description generated");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to generate description"
      );
    } finally {
      setGeneratingDescription(false);
    }
  };

  const saveRestaurantChanges = async () => {
    if (!editingRestaurant) return;

    try {
      setSavingRestaurant(true);
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("phone", editPhone);
      formData.append("cuisine", editCuisine);
      formData.append("deliveryTimeMinutes", editDeliveryTime);
      formData.append("priceRange", editPriceRange);
      formData.append("rating", editRating);
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

  const bulkSetAvailability = async (isAvailable: boolean) => {
    if (!selectedRestaurant) return;
    try {
      await axios.put(
        `${restaurantService}/api/item/bulk/availability`,
        {
          restaurantId: selectedRestaurant._id,
          itemIds: visibleMenuItems.map((item) => item._id),
          isAvailable,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(
        isAvailable ? "Selected menu items are live" : "Selected menu items hidden"
      );
      fetchMenuItems(selectedRestaurant._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bulk update failed");
    }
  };

  const handleGeneratePerformanceInsight = async () => {
    if (!selectedRestaurant) return;

    try {
      setGeneratingInsight(true);
      const insight = await generateSellerPerformanceInsight({
        restaurantName: selectedRestaurant.name,
        stats: salesStats,
        performance,
        menuItems: menuItems.map((item) => ({
          name: item.name,
          category: item.category,
          price: item.price,
        })),
      });
      setAiInsight(insight);
      toast.success("AI performance insight ready");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to generate performance insight"
      );
    } finally {
      setGeneratingInsight(false);
    }
  };

  if (loading) {
    return <SkeletonState type="orders" title="Partner workspace" />;
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
                  <span className="status-badge bg-white">
                    {restaurants.length} total
                  </span>
                </div>

                <div className="flex min-w-max gap-4">
                  {restaurants.map((restaurant) => {
                    const isActive = restaurant._id === selectedRestaurantId;

                    return (
                      <div
                        key={restaurant._id}
                        className={`ui-card w-[284px] shrink-0 overflow-hidden p-0 transition ${
                          isActive
                            ? "border-[var(--accent)] shadow-[6px_6px_0_var(--text)]"
                            : ""
                        }`}
                      >
                        <div className="relative h-40 overflow-hidden bg-[var(--surface-muted)]">
                          {restaurant.image ? (
                            <img
                              src={restaurant.image}
                              alt={restaurant.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#94a3b8]">
                              <FiShoppingBag size={28} />
                            </div>
                          )}

                          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                            <span className={`status-badge bg-white/90 ${restaurant.isOpen ? "status-badge-success" : "status-badge-warning"}`}>
                              {restaurant.isOpen ? "Open" : "Closed"}
                            </span>
                            {isActive && (
                              <span className="status-badge border-[var(--text)] bg-[var(--accent)] text-white">
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
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8e3ef] text-[#64748b] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
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
                            <div className="flex items-start gap-2 rounded-2xl bg-[#eef6ff] p-3 text-sm text-[#506277]">
                              <FiMapPin className="mt-0.5 shrink-0 text-[var(--accent)]" />
                              <p className="line-clamp-3">
                                {restaurant.autoLocation?.formattedAddress ||
                                  "Location unavailable"}
                              </p>
                            </div>
                          </button>
                        </div>

                        <div className="flex gap-3 border-t border-[#d8e3ef] px-4 py-4">
                          <button
                            onClick={() => setSelectedRestaurantId(restaurant._id)}
                            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? "bg-[#1f1a17] text-white"
                                : "bg-[#eef6ff] text-[#334155] hover:bg-[#dbeafe]"
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
                    className="ui-card flex w-[250px] shrink-0 flex-col items-center justify-center border-dashed px-6 py-8 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <FiPlus size={24} />
                    </div>
                    <p className="mt-4 text-base font-semibold text-[#1f1a17]">
                      Add Another Restaurant
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
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
            restaurantName={selectedRestaurant.name}
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

              <div className="mobile-tabs sm:w-auto">
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
                      type="button"
                      onClick={() => setTab("add-item")}
                      className="brand-button min-h-11 items-center px-4 py-3 text-sm font-black"
                    >
                      <FiPlusCircle size={16} />
                      Add Item
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => bulkSetAvailability(true)}
                        className="action-button px-3 py-2 text-xs"
                      >
                        All Live
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkSetAvailability(false)}
                        className="action-button px-3 py-2 text-xs"
                      >
                        Hide All
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      className="field-input py-3 text-sm"
                      placeholder="Search menu items"
                    />
                    <div className="mobile-tabs md:w-auto">
                      <button
                        type="button"
                        onClick={() => setMenuCategory("all")}
                        className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                          menuCategory === "all"
                            ? "bg-[var(--accent)] text-white shadow-[3px_3px_0_var(--text)]"
                            : "text-[var(--text-soft)]"
                        }`}
                      >
                        All
                      </button>
                      {menuCategories.map((currentCategory) => (
                        <button
                          key={currentCategory}
                          type="button"
                          onClick={() => setMenuCategory(currentCategory)}
                          className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                            menuCategory === currentCategory
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
                    items={visibleMenuItems}
                    onItemDeleted={() => fetchMenuItems(selectedRestaurant._id)}
                    isSeller={true}
                  />
                  <div className="mobile-action-bar sm:hidden">
                    <button
                      type="button"
                      onClick={() => setTab("add-item")}
                      className="action-button action-button-primary w-full px-4 py-3 text-sm"
                    >
                      <FiPlusCircle size={16} />
                      Add Item
                    </button>
                  </div>
                </div>
              )}
              {tab === "add-item" && (
                <AddMenuItem
                  restaurantId={selectedRestaurant._id}
                  onItemAdded={() => fetchMenuItems(selectedRestaurant._id)}
                />
              )}
              {tab === "sales" && (
                <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-[26px] border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[linear-gradient(145deg,#ffffff_0%,var(--accent-soft)_100%)] p-5 shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_16%,transparent)] sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                      AI Performance
                    </p>
                    <h3 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">
                      Seller insight assistant
                    </h3>
                    <p className="mt-3 max-w-prose text-sm leading-6 text-[var(--text-soft)]">
                      Generate a focused action plan from your revenue, orders,
                      top items, low performers, payout, and current menu.
                    </p>
                    <button
                      type="button"
                      onClick={handleGeneratePerformanceInsight}
                      disabled={generatingInsight}
                      className="brand-button mt-5 min-h-12 px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiZap size={16} />
                      {generatingInsight ? "Analyzing..." : "Generate AI Insight"}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        label: "Revenue",
                        value: `Rs ${salesStats.revenue.toFixed(2)}`,
                        detail: "From delivered paid orders",
                        tone: "text-[var(--accent)]",
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
                        className="min-h-40 rounded-[24px] border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-white p-5 shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_16%,transparent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-6"
                      >
                        <p className="text-sm font-bold text-[var(--text-soft)]">
                          {item.label}
                        </p>
                        <p className={`mt-5 break-words text-2xl font-black ${item.tone}`}>
                          {item.value}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                  {aiInsight && (
                    <div className="ui-card space-y-5 p-5 xl:col-span-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                            AI Recommendation
                          </p>
                          <h3 className="mt-2 text-xl font-black text-[var(--text)]">
                            {aiInsight.summary}
                          </h3>
                        </div>
                        <span className="status-badge bg-[var(--accent-soft)]">
                          {aiInsight.provider === "local"
                            ? "Local fallback"
                            : "Gemini AI"}
                        </span>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--accent)_22%,white)] bg-[var(--accent-soft)] p-4">
                          <p className="text-sm font-black text-[var(--text)]">
                            Opportunities
                          </p>
                          <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-soft)]">
                            {aiInsight.opportunities.map((item) => (
                              <p key={item}>{item}</p>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-white p-4">
                          <p className="text-sm font-black text-[var(--text)]">
                            Next Actions
                          </p>
                          <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-soft)]">
                            {aiInsight.actions.map((item) => (
                              <p key={item}>{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {performance && (
                    <div className="space-y-4 xl:col-span-2">
                      <div className="ui-card p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                              30 Day Chart
                            </p>
                            <h3 className="mt-2 text-xl font-black text-[var(--text)]">
                              Sales trend
                            </h3>
                          </div>
                          <span className="status-badge status-badge-success">
                            Payout Rs {performance.payout.estimatedSellerPayout}
                          </span>
                        </div>
                        <div className="mt-5 flex h-44 items-end gap-2">
                          {(performance.chart.length
                            ? performance.chart
                            : [{ label: "No sales", revenue: 0, orders: 0 }]
                          ).map((point) => {
                            const maxRevenue = Math.max(
                              ...performance.chart.map((item) => item.revenue),
                              1
                            );
                            return (
                              <div
                                key={point.label}
                                className="flex min-w-10 flex-1 flex-col items-center gap-2"
                              >
                                <div
                                  className="w-full rounded-t-xl bg-[var(--accent)] shadow-[3px_3px_0_var(--text)]"
                                  style={{
                                    height: `${Math.max(
                                      12,
                                      (point.revenue / maxRevenue) * 140
                                    )}px`,
                                  }}
                                  title={`Rs ${point.revenue}`}
                                />
                                <span className="max-w-14 truncate text-[10px] font-bold text-[var(--text-soft)]">
                                  {point.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="ui-card p-4">
                          <p className="text-sm font-black text-[var(--text)]">
                            Payout Summary
                          </p>
                          <div className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
                            <p>Gross: Rs {performance.payout.grossRevenue}</p>
                            <p>Platform: Rs {performance.payout.platformFees}</p>
                            <p>Rider: Rs {performance.payout.riderPayouts}</p>
                          </div>
                        </div>
                        <div className="ui-card p-4">
                          <p className="text-sm font-black text-[var(--text)]">
                            Top-performing
                          </p>
                          <p className="mt-3 text-sm text-[var(--text-soft)]">
                            {performance.topItems[0]?.name || "No sales yet"}
                          </p>
                        </div>
                        <div className="ui-card p-4">
                          <p className="text-sm font-black text-[var(--text)]">
                            Low-performing
                          </p>
                          <p className="mt-3 text-sm text-[var(--text-soft)]">
                            {performance.lowItems[0]?.name || "No sales yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,17,40,0.58)] p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[var(--text)] bg-white p-5 shadow-[9px_9px_0_var(--text)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Edit Restaurant
                </p>
                <h2 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">
                  {editingRestaurant.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--text)_16%,transparent)] bg-white text-[var(--text-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Restaurant Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-base"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                    Cuisine
                  </label>
                  <input
                    type="text"
                    value={editCuisine}
                    onChange={(e) => setEditCuisine(e.target.value)}
                    className="field-input bg-white px-4 py-3 text-base"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                    Delivery Time
                  </label>
                  <input
                    type="number"
                    value={editDeliveryTime}
                    onChange={(e) => setEditDeliveryTime(e.target.value)}
                    className="field-input bg-white px-4 py-3 text-base"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                    Price Range
                  </label>
                  <select
                    value={editPriceRange}
                    onChange={(e) => setEditPriceRange(e.target.value)}
                    className="field-input bg-white px-4 py-3 text-base"
                  >
                    <option value="budget">Budget</option>
                    <option value="mid">Mid range</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-base"
                />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-bold text-[var(--text)]">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRestaurantDescription}
                    disabled={generatingDescription}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-[color-mix(in_srgb,var(--accent)_32%,white)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-black text-[var(--accent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingDescription ? "Generating..." : "Generate description"}
                  </button>
                </div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="field-input min-h-32 resize-y bg-white px-4 py-3 text-sm"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[color-mix(in_srgb,var(--accent)_38%,white)] bg-[var(--accent-soft)] p-4 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--accent)] hover:bg-white">
                <BiUpload className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 truncate">
                  {editImage ? editImage.name : "Upload new restaurant image (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                />
              </label>

              <div className="flex items-start gap-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--text-soft)]">
                <FiMapPin className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p className="leading-6">
                  {editingRestaurant.autoLocation?.formattedAddress ||
                    "Location unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_18%,transparent)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRestaurantChanges}
                disabled={savingRestaurant}
                className="brand-button px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
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
