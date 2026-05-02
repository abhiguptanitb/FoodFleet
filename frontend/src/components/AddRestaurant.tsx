import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../main";
import { BiUpload } from "react-icons/bi";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";

// 🔧 Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 📍 Click-to-select location
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

// 🎯 Locate me button
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
      onClick={locateUser}
      className="absolute right-3 top-3 z-1000 flex items-center gap-2
rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
    >
      <LuLocateFixed size={16} />
      Use current location
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
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 📍 Local location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState("");

  // 🌍 Reverse geocoding
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
      {/* Backdrop Overlay */}
      {onCancel && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onCancel}
        />
      )}

      {/* Modal Container */}
      <div
        className={`${
          onCancel
            ? "fixed inset-0 z-50 flex items-center justify-center p-4"
            : "min-h-screen bg-gray-50 px-4 py-6"
        }`}
      >
        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e23744]">
                New Restaurant
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[#1f1a17]">
                {hasExistingRestaurants ? "Add Another Restaurant" : "Add Your Restaurant"}
              </h1>
              <p className="mt-1 text-sm text-[#6d5d52]">
                Fill in the details to create a new restaurant outlet.
              </p>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {/* Form Content */}
          <div className="space-y-5">
            {/* Restaurant Name */}
            <div>
              <label className="block text-sm font-semibold text-[#1f1a17] mb-2">
                Restaurant Name
              </label>
              <input
                type="text"
                placeholder="Enter restaurant name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[#e8d7c3] px-4 py-3 text-sm outline-none focus:border-[#e23744] focus:ring-1 focus:ring-[#e23744] bg-[#fafaf8]"
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-semibold text-[#1f1a17] mb-2">
                Contact Number
              </label>
              <input
                type="text"
                placeholder="Enter contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[#e8d7c3] px-4 py-3 text-sm outline-none focus:border-[#e23744] focus:ring-1 focus:ring-[#e23744] bg-[#fafaf8]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-[#1f1a17] mb-2">
                Restaurant Description
              </label>
              <textarea
                placeholder="Write a brief description about your restaurant"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#e8d7c3] px-4 py-3 text-sm outline-none focus:border-[#e23744] focus:ring-1 focus:ring-[#e23744] bg-[#fafaf8] resize-none"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-[#1f1a17] mb-2">
                Restaurant Image
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#e8d7c3] p-6 text-sm text-gray-600 hover:bg-[#fff5f0] transition bg-[#fafaf8]">
                <BiUpload className="h-6 w-6 text-[#e23744]" />
                <div className="text-left">
                  <p className="font-semibold text-[#1f1a17]">
                    {image ? image.name : "Upload restaurant image"}
                  </p>
                  <p className="text-xs text-[#8a7464] mt-1">
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

            {/* Map Picker */}
            <div>
              <label className="block text-sm font-semibold text-[#1f1a17] mb-2">
                Restaurant Location
              </label>
              <p className="text-xs text-[#8a7464] mb-3">
                Click on the map to select your restaurant's location
              </p>
              <div className="relative h-72 w-full overflow-hidden rounded-xl border border-[#e8d7c3]">
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

            {/* Selected Address Display */}
            {formattedAddress && (
              <div className="flex items-start gap-3 rounded-xl bg-[#f0fdf4] p-4 border border-[#bbf7d0]">
                <span className="text-lg mt-0.5">📍</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#15803d] mb-1">
                    Selected Location
                  </p>
                  <p className="text-sm text-[#166534]">
                    {formattedAddress}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-[#e8d7c3] px-4 py-3 text-sm font-semibold text-[#1f1a17] hover:bg-[#faf9f7] transition"
              >
                Cancel
              </button>
            )}
            <button
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-white bg-[#e23744] hover:bg-[#d32f3a] disabled:opacity-50 disabled:cursor-not-allowed transition"
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
