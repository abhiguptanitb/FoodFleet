import { useState } from "react";
import type { IMenuItem } from "../types";
import { FiEdit3, FiEyeOff, FiX } from "react-icons/fi";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { BiTrash, BiUpload } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<IMenuItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Popular");
  const [variants, setVariants] = useState("");
  const [addOns, setAddOns] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { fetchCart, cart } = useAppData();

  const openEditModal = (item: IMenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setCategory(item.category || "Popular");
    setVariants(
      item.variants?.map((variant) => variant.name).join(", ") || ""
    );
    setAddOns(item.addOns?.map((addon) => addon.name).join(", ") || "");
    setImage(null);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory("Popular");
    setVariants("");
    setAddOns("");
    setImage(null);
  };

  const saveItemChanges = async () => {
    if (!editingItem) return;
    if (!name || !price) {
      toast.error("Name and price are required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("category", category);
    formData.append(
      "variants",
      JSON.stringify(
        variants
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name, priceDelta: 0 }))
      )
    );
    formData.append(
      "addOns",
      JSON.stringify(
        addOns
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name, price: 0 }))
      )
    );

    if (image) {
      formData.append("file", image);
    }

    try {
      setSaving(true);
      const { data } = await axios.put(
        `${restaurantService}/api/item/${editingItem._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      closeEditModal();
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this item");
    if (!confirm) return;

    try {
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Item deleted");
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete item");
    }
  };

  const toggleAvailiblity = async (itemId: string) => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to update status");
    }
  };

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);

      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId,
          itemId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      fetchCart();
    } catch (error: any) {
      toast.error(error.response.data.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseFromCart = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update cart");
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <>
      {items.length === 0 && (
        <div className="empty-state">
          <div>
            <p className="text-lg font-black text-[var(--text)]">
              No menu items yet
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-soft)]">
              {isSeller
                ? "Add your first dish to start building this restaurant menu."
                : "This restaurant has not published menu items yet."}
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isLoading = loadingItemId === item._id;
          const cartItem = cart?.find((entry) => {
            const currentItem =
              typeof entry.itemId === "string" ? entry.itemId : entry.itemId._id;
            return currentItem === item._id;
          });
          const quantity = cartItem?.quauntity || 0;

          return (
            <div
              className={`ui-card compact-mobile-row group relative flex min-h-[8.75rem] gap-4 p-3 transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-4 ${
                !item.isAvailable ? "opacity-70" : ""
              }`}
              key={item._id}
            >
              <div className="relative shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className={`h-24 w-24 rounded-2xl border border-black/5 object-cover sm:h-28 sm:w-28 ${
                    !item.isAvailable ? "grayscale brightness-75" : ""
                  }`}
                />
                {!item.isAvailable && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/65 px-2 text-center text-[11px] font-semibold leading-4 text-white">
                    Not Available
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-base font-bold text-[var(--text)]">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-soft)]">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="shrink-0 whitespace-nowrap text-base font-black text-[var(--text)]">
                    Rs {item.price}
                  </p>

                  {isSeller && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Edit item"
                        onClick={() => openEditModal(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[var(--accent)] hover:border-[color-mix(in_srgb,var(--accent)_30%,white)] hover:bg-[var(--accent-soft)]"
                      >
                        <FiEdit3 size={18} />
                      </button>

                      <button
                        type="button"
                        title={item.isAvailable ? "Hide item" : "Show item"}
                        onClick={() => toggleAvailiblity(item._id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[var(--text-soft)] hover:border-[color-mix(in_srgb,var(--text)_18%,transparent)] hover:bg-[#f4f7fb] hover:text-[var(--text)]"
                      >
                        {item.isAvailable ? (
                          <BsEye size={18} />
                        ) : (
                          <FiEyeOff size={18} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete item"
                        onClick={() => handleDelete(item._id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[#f04438] hover:border-[#ffd6d2] hover:bg-[#fff1f0]"
                      >
                        <BiTrash size={18} />
                      </button>
                    </div>
                  )}

                  {!isSeller && (
                    <>
                      {quantity > 0 ? (
                        <div className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[var(--text)] bg-white px-2 shadow-[3px_3px_0_var(--text)]">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => decreaseFromCart(item._id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text)] hover:bg-[var(--accent-soft)]"
                          >
                            -
                          </button>
                          <span className="min-w-5 text-center text-sm font-black">
                            {isLoading ? (
                              <VscLoading size={16} className="mx-auto animate-spin" />
                            ) : (
                              quantity
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => addToCart(item.restaurantId, item._id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!item.isAvailable || isLoading}
                          onClick={() => addToCart(item.restaurantId, item._id)}
                          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl ${
                            !item.isAvailable || isLoading
                              ? "cursor-not-allowed text-gray-400"
                              : "border-2 border-[var(--text)] bg-[var(--accent)] px-3 text-white shadow-[3px_3px_0_var(--text)] hover:-translate-y-0.5"
                          }`}
                        >
                          {isLoading ? (
                            <VscLoading size={18} className="animate-spin" />
                          ) : (
                            <BsCartPlus size={18} />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingItem && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(10,17,40,0.72)] backdrop-blur-sm"
            onClick={closeEditModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[var(--text)] bg-white p-5 shadow-[9px_9px_0_var(--text)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
                    Edit Item
                  </p>
                <h2 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">
                  {editingItem.name}
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
                  Item Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="field-input min-h-32 resize-y bg-white px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Price
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-base"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                    Variants
                  </label>
                  <input
                    type="text"
                    value={variants}
                    onChange={(e) => setVariants(e.target.value)}
                    className="field-input bg-white px-4 py-3 text-base"
                    placeholder="Small, Medium, Large"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                    Add-ons
                  </label>
                  <input
                    type="text"
                    value={addOns}
                    onChange={(e) => setAddOns(e.target.value)}
                    className="field-input bg-white px-4 py-3 text-base"
                    placeholder="Extra cheese, Toppings"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[color-mix(in_srgb,var(--accent)_38%,white)] bg-[var(--accent-soft)] p-4 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--accent)] hover:bg-white">
                <BiUpload className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 truncate">
                  {image ? image.name : "Upload new item image (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>
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
                onClick={saveItemChanges}
                disabled={saving}
                className="brand-button px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
};

export default MenuItems;
