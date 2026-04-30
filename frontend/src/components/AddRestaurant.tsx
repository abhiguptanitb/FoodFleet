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
    <div className={hasExistingRestaurants ? "px-0 py-0" : "min-h-screen bg-gray-50 px-4 py-6"}>
      <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">
            {hasExistingRestaurants ? "Add Another Restaurant" : "Add Your Restaurant"}
          </h1>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
        
        {/* Restaurant Name */}
        <input
          type="text"
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        {/* Contact Number */}
        <input
          type="number"
          placeholder="Contact Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        {/* Description */}
        <textarea
          placeholder="Restaurant Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        {/* Image Upload */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
          <BiUpload className="h-5 w-5 text-red-500" />
          {image ? image.name : "Upload restaurant image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>

        {/* 🗺 Map Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Restaurant Location
          </label>
          <div className="relative h-64 w-full overflow-hidden rounded-lg border">
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

        {/* 📍 Selected Address Display */}
        {formattedAddress && (
          <div className="rounded-lg border bg-green-50 p-3 text-sm">
            📍 {formattedAddress}
          </div>
        )}

        {/* Submit Button */}
        <button
          className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#e23744] hover:bg-[#d32f3a] disabled:opacity-50 disabled:cursor-not-allowed transition"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Add Restaurant"}
        </button>
      </div>
    </div>
  );
};

export default AddRestaurant;
