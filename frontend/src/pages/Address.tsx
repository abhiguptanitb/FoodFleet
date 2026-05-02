import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash } from "react-icons/bi";
import LoadingState from "../components/LoadingState";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

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
      toast.error("Geolocation is not supported");
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
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-[#1f1a17] shadow-[0_10px_20px_rgba(84,56,35,0.14)] hover:bg-[#fff8f3]"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
  };
};

const AddAddressPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

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

  const fetchAddresses = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      toast.error("Please log in to load addresses");
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers,
      });
      const result = Array.isArray(data) ? data : data?.addresses ?? [];
      setAddresses(result);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const addAddress = async () => {
    if (latitude === null || longitude === null) {
      toast.error("Please select a location on the map");
      return;
    }

    if (!mobile || !formattedAddress) {
      toast.error("Please fill in both mobile and address details");
      return;
    }

    try {
      setAdding(true);
      const headers = getAuthHeaders();
      if (!headers) {
        toast.error("Please log in to add an address");
        return;
      }

      await axios.post(
        `${restaurantService}/api/address/new`,
        {
          formattedAddress,
          mobile,
          latitude,
          longitude,
        },
        { headers }
      );

      toast.success("Address added");
      setMobile("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add address");
    } finally {
      setAdding(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        toast.error("Please log in to delete an address");
        return;
      }
      setDeletingId(id);
      await axios.delete(`${restaurantService}/api/address/${id}`, { headers });
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-wrap space-y-6 py-6">
      <section className="hero-panel fade-up p-5 sm:p-6">
        <p className="pill-label">Addresses</p>
        <h1 className="mt-4 text-3xl font-semibold text-[#1f1a17]">
          Manage delivery locations
        </h1>
        <p className="section-copy mt-3 text-sm">
          Pin your location on the map, confirm the address, and save it for future orders.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="soft-card overflow-hidden p-4 sm:p-5">
          <div className="relative h-[420px] overflow-hidden rounded-[24px] border border-[#ead8cb]">
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
              {latitude && longitude && <Marker position={[latitude, longitude]} />}
            </MapContainer>
          </div>

          {formattedAddress && (
            <div className="mt-4 rounded-2xl bg-[#eef8f1] px-4 py-3 text-sm text-[#25553f]">
              Selected address: {formattedAddress}
            </div>
          )}
        </section>

        <section className="soft-card p-5">
          <h2 className="text-xl font-semibold text-[#1f1a17]">Save New Address</h2>
          <div className="mt-4 space-y-4">
            <input
              type="number"
              placeholder="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="field-input"
            />
            <textarea
              placeholder="Selected address will appear here"
              value={formattedAddress}
              onChange={(e) => setFormattedAddress(e.target.value)}
              rows={4}
              className="field-input"
            />

            <button
              disabled={adding}
              onClick={addAddress}
              className="brand-button flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold disabled:opacity-50"
            >
              {adding ? <BiLoader className="animate-spin" /> : <BiPlus />}
              Save Address
            </button>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1f1a17]">Saved Addresses</h3>
              <span className="rounded-full bg-[#fff1e8] px-3 py-1 text-xs font-semibold text-[#e4572e]">
                {addresses.length}
              </span>
            </div>

            {loading ? (
              <LoadingState
                compact
                title="Loading saved addresses"
                copy="Your delivery locations are being prepared."
              />
            ) : addresses.length === 0 ? (
              <div className="rounded-2xl bg-[#fff7f1] px-4 py-4 text-sm text-[#8a6d59]">
                No saved addresses yet.
              </div>
            ) : (
              addresses.map((addr) => (
                <div
                  key={addr._id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[#ead8cb] bg-white p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1f1a17]">
                      {addr.formattedAddress}
                    </p>
                    <p className="mt-1 text-xs text-[#6d5d52]">
                      Contact: {addr.mobile}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAddress(addr._id)}
                    disabled={deletingId === addr._id}
                    className="rounded-2xl p-2 text-[#cc4b37] hover:bg-[#fff0eb] disabled:opacity-50"
                  >
                    {deletingId === addr._id ? (
                      <BiLoader size={16} className="animate-spin" />
                    ) : (
                      <BiTrash size={16} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AddAddressPage;
