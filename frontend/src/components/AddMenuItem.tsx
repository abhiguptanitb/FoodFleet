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
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-[#efdfd2] bg-[#fffaf7] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b48668]">
          New Dish
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[#1f1a17]">
          Add a menu item
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#6d5d52]">
          Add the dish details customers will see before ordering.
        </p>

        <label className="mt-6 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#e6c9b7] bg-white p-5 text-center transition hover:border-[#e4572e] hover:bg-[#fff7f1]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1e8] text-[#e4572e]">
            {image ? <FiImage size={24} /> : <BiUpload size={24} />}
          </div>
          <p className="mt-4 max-w-full truncate text-sm font-semibold text-[#2f251f]">
            {image ? image.name : "Upload item image"}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#8a7464]">
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

      <div className="rounded-3xl border border-[#efdfd2] bg-white p-5 shadow-[0_16px_32px_rgba(86,57,35,0.06)] sm:p-6">
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4f3f34]">
              Item Name
            </label>
            <input
              type="text"
              placeholder="Paneer tikka wrap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-sm text-[#1f1a17] outline-none transition focus:border-[#e4572e] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4f3f34]">
              Description
            </label>
            <textarea
              placeholder="Short description, key ingredients, spice level"
              value={description}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] px-4 py-3 text-sm text-[#1f1a17] outline-none transition focus:border-[#e4572e] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4f3f34]">
              Price
            </label>
            <div className="relative">
              <FiTag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b48668]" />
              <input
                type="number"
                placeholder="199"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-[#e7d3c6] bg-[#fffaf7] py-3 pl-11 pr-4 text-sm text-[#1f1a17] outline-none transition focus:border-[#e4572e] focus:bg-white"
              />
            </div>
          </div>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e4572e] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#cb4720] disabled:cursor-not-allowed disabled:opacity-60"
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
