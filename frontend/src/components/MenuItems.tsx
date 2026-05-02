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
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const openEditModal = (item: IMenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setImage(null);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
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

  const { fetchCart } = useAppData();

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

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const isLoading = loadingItemId === item._id;

          return (
            <div
              className={`group relative flex gap-4 rounded-[24px] border border-[#ecdccf] bg-white p-4 shadow-[0_16px_30px_rgba(84,56,35,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_36px_rgba(84,56,35,0.14)] ${
                !item.isAvailable ? "opacity-70" : ""
              }`}
              key={item._id}
            >
              <div className="relative shrink-0">
                <img
                  src={item.image}
                  alt=""
                  className={`h-24 w-24 rounded-2xl object-cover ${
                    !item.isAvailable ? "grayscale brightness-75" : ""
                  }`}
                />
                {!item.isAvailable && (
                  <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">
                    Not Available
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#1f1a17]">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-[#6d5d52]">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="shrink-0 whitespace-nowrap font-semibold text-[#1f1a17]">
                    Rs {item.price}
                  </p>

                  {isSeller && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <FiEdit3 size={18} />
                      </button>

                      <button
                        onClick={() => toggleAvailiblity(item._id)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                      >
                        {item.isAvailable ? (
                          <BsEye size={18} />
                        ) : (
                          <FiEyeOff size={18} />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(item._id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <BiTrash size={18} />
                      </button>
                    </div>
                  )}

                  {!isSeller && (
                    <button
                      disabled={!item.isAvailable || isLoading}
                      onClick={() => addToCart(item.restaurantId, item._id)}
                      className={`flex items-center justify-center rounded-lg p-2 ${
                        !item.isAvailable || isLoading
                          ? "cursor-not-allowed text-gray-400"
                          : "rounded-2xl bg-[#fff1e8] px-3 py-2 text-[#e4572e] hover:bg-[#ffe6d6]"
                      }`}
                    >
                      {isLoading ? (
                        <VscLoading size={18} className="animate-spin" />
                      ) : (
                        <BsCartPlus size={18} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-[0_22px_60px_rgba(0,0,0,0.25)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e4572e]">
                  Edit Item
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1f1a17]">
                  {editingItem.name}
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
                  Item Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-base text-[#1f1a17] outline-none transition focus:border-[#e4572e]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f3f34]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-sm text-[#3a2d25] outline-none transition focus:border-[#e4572e]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f3f34]">
                  Price
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-base text-[#1f1a17] outline-none transition focus:border-[#e4572e]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] p-4 text-sm text-gray-600 hover:bg-[#fff4ec]">
                <BiUpload className="h-5 w-5 text-[#e4572e]" />
                {image ? image.name : "Upload new item image (optional)"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeEditModal}
                className="rounded-2xl border border-[#ecd6c7] px-4 py-3 text-sm font-semibold text-[#6a5548] transition hover:border-[#e4572e] hover:text-[#e4572e]"
              >
                Cancel
              </button>
              <button
                onClick={saveItemChanges}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e4572e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#cb4720] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItems;
