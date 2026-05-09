import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../main";
import { BiUpload } from "react-icons/bi";
import { FiCheckCircle, FiX } from "react-icons/fi";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";

// Fix leaflet marker icon issue.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied")
    );
  };
  return (
    <button
      type="button"
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-2 rounded-2xl border-2 border-[var(--text)] bg-white px-3 py-2 text-sm font-bold text-[var(--text)] shadow-[4px_4px_0_color-mix(in_srgb,var(--accent)_22%,transparent)] hover:-translate-y-0.5 hover:border-[var(--accent)] sm:px-4"
    >
      <LuLocateFixed size={16} />
      <span className="hidden sm:inline">Use current location</span>
    </button>
  );
};

interface props {
  fetchMyRestaurant: () => Promise<void>;
  onCancel?: () => void;
  hasExistingRestaurants?: boolean;
}

const AddRestaurant = ({
  fetchMyRestaurant,
  onCancel,
  hasExistingRestaurants = false,
}: props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [deliveryTimeMinutes, setDeliveryTimeMinutes] = useState("");
  const [priceRange, setPriceRange] = useState("mid");
  const [rating, setRating] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState("");

  const fetchFormattedAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      setFormattedAddress(data.display_name || "");
    } catch {
      toast.error("Failed to fetch address");
    }
  };

  const setLocation = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchFormattedAddress(lat, lng);
  };

  const handleSubmit = async () => {
    if (!name || !image || latitude === null || longitude === null) {
      toast.error("Please fill all required fields and select a location");
      return;
    }

    if (rating && (Number.isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
      toast.error("Rating must be a number between 0 and 5");
      return;
    }

    if (!formattedAddress) {
      toast.error("Please ensure address is loaded");
      return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", description);
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
    formData.append("formattedAddress", formattedAddress);
    formData.append("file", image);
    formData.append("phone", phone);
    formData.append("cuisine", cuisine || "Mixed");
    formData.append("deliveryTimeMinutes", deliveryTimeMinutes);
    formData.append("priceRange", priceRange);
    formData.append("rating", rating);

    try {
      setSubmitting(true);
      await axios.post(`${restaurantService}/api/restaurant/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Restaurant Added successfully");
      fetchMyRestaurant();
    } catch (error: any) {
      toast.error(error.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      {onCancel && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(10,17,40,0.58)] backdrop-blur-sm"
          onClick={onCancel}
        />
      )}

      <div
        className={`${
          onCancel
            ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
            : "role-page min-h-screen px-4 py-6"
        }`}
      >
        <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-4xl space-y-6 overflow-y-auto rounded-[28px] border-2 border-[var(--text)] bg-white p-5 shadow-[9px_9px_0_var(--text)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                New Restaurant
              </p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">
                {hasExistingRestaurants ? "Add Another Restaurant" : "Add Your Restaurant"}
              </h1>
              <p className="mt-2 max-w-prose text-sm leading-6 text-[var(--text-soft)]">
                Fill in the details to create a new restaurant outlet.
              </p>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--text)_16%,transparent)] bg-white text-[var(--text-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <FiX size={18} />
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                Restaurant Name
              </label>
              <input
                type="text"
                placeholder="Enter restaurant name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input bg-white px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                Contact Number
              </label>
              <input
                type="text"
                placeholder="Enter contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field-input bg-white px-4 py-3 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Cuisine
                </label>
                <input
                  type="text"
                  placeholder="Pizza, Biryani, Cafe"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Delivery Time
                </label>
                <input
                  type="number"
                  placeholder="30"
                  value={deliveryTimeMinutes}
                  onChange={(e) => setDeliveryTimeMinutes(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Price Range
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="field-input bg-white px-4 py-3 text-sm"
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
                placeholder="4.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="field-input bg-white px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                Restaurant Description
              </label>
              <textarea
                placeholder="Write a brief description about your restaurant"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="field-input min-h-28 resize-y bg-white px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                Restaurant Image
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-[color-mix(in_srgb,var(--accent)_36%,white)] bg-[var(--accent-soft)] p-5 text-center text-sm text-[var(--text-soft)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white sm:flex-row sm:p-6 sm:text-left">
                <BiUpload className="h-6 w-6 shrink-0 text-[var(--accent)]" />
                <div className="min-w-0">
                  <p className="max-w-full truncate font-black text-[var(--text)]">
                    {image ? image.name : "Upload restaurant image"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                    Use a clear square or landscape food photo
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                Restaurant Location
              </label>
              <p className="mb-3 text-xs leading-5 text-[var(--text-soft)]">
                Click on the map to select your restaurant's location
              </p>
              <div className="relative h-72 w-full overflow-hidden rounded-[22px] border-2 border-[color-mix(in_srgb,var(--text)_14%,transparent)] shadow-[5px_5px_0_color-mix(in_srgb,var(--accent)_14%,transparent)] sm:h-80">
                <MapContainer
                  center={[latitude || 28.6139, longitude || 77.209]}
                  zoom={13}
                  className="h-full w-full"
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationPicker setLocation={setLocation} />
                  <LocateMeButton onLocate={setLocation} />
                  {latitude && longitude && (
                    <Marker position={[latitude, longitude]} />
                  )}
                </MapContainer>
              </div>
            </div>

            {formattedAddress && (
              <div className="flex items-start gap-3 rounded-[22px] border-2 border-[color-mix(in_srgb,var(--success)_26%,white)] bg-[color-mix(in_srgb,var(--success)_8%,white)] p-4">
                <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--success)]">
                    Selected Location
                  </p>
                  <p className="text-sm leading-6 text-[var(--text-soft)]">
                    {formattedAddress}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-2xl border-2 border-[color-mix(in_srgb,var(--text)_18%,transparent)] bg-white px-4 py-3 text-sm font-bold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="brand-button flex-1 px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Add Restaurant"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddRestaurant;
