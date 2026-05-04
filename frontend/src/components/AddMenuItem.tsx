import axios from "axios";
import { useState } from "react";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import { FiImage, FiPlusCircle, FiTag } from "react-icons/fi";

const AddMenuItem = ({
  restaurantId,
  onItemAdded,
}: {
  restaurantId: string;
  onItemAdded: () => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setImage(null);
  };

  const handleSubmit = async () => {
    if (!name || !price || !image) {
      toast.error("Name, price, and image are required");
      return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("restaurantId", restaurantId);
    formData.append("file", image);

    try {
      setLoading(true);
      await axios.post(`${restaurantService}/api/item/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Item added successfully");
      resetForm();
      onItemAdded();
    } catch (error) {
      console.log(error);
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[26px] border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[linear-gradient(145deg,#ffffff_0%,var(--accent-soft)_100%)] p-5 shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_16%,transparent)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
          New Dish
        </p>
        <h2 className="mt-3 text-2xl font-black text-[var(--text)] sm:text-3xl">
          Add a menu item
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-6 text-[var(--text-soft)]">
          Add the dish details customers will see before ordering.
        </p>

        <label className="mt-6 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[color-mix(in_srgb,var(--accent)_36%,white)] bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_18%,transparent)] sm:aspect-[4/3]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]">
            {image ? <FiImage size={24} /> : <BiUpload size={24} />}
          </div>
          <p className="mt-4 max-w-full truncate text-base font-black text-[var(--text)]">
            {image ? image.name : "Upload item image"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Use a clear square or landscape food photo.
          </p>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      <div className="rounded-[26px] border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] bg-white p-5 shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_16%,transparent)] sm:p-6">
        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text)]">
              Item Name
            </label>
            <input
              type="text"
              placeholder="Paneer tikka wrap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field-input bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text)]">
              Description
            </label>
            <textarea
              placeholder="Short description, key ingredients, spice level"
              value={description}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className="field-input min-h-32 resize-y bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text)]">
              Price
            </label>
            <div className="relative">
              <FiTag className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent)]" />
              <input
                type="number"
                placeholder="199"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="field-input bg-white py-3 pl-11 pr-4 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="brand-button mt-2 min-h-12 w-full px-4 py-3.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiPlusCircle size={17} />
            {loading ? "Adding..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMenuItem;
