import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import { LuLocateFixed } from "react-icons/lu";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LocationPicker = ({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

const RecenterMap = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], 14, { animate: true });
  }, [latitude, longitude, map]);

  return null;
};

const Navbar = () => {
  const {
    isAuth,
    city,
    quauntity,
    location,
    loadingLocation,
    updateLocation,
    refreshCurrentLocation,
  } = useAppData();
  const currLocation = useLocation();

  const isHomePage = currLocation.pathname === "/";

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (location) {
      setSelectedPoint({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  }, [location]);

  const handleUseCurrentLocation = async () => {
    try {
      await refreshCurrentLocation();
      toast.success("Current location selected");
      setLocationModalOpen(false);
    } catch (error) {
      toast.error("Unable to get current location");
    }
  };

  const handleConfirmManualLocation = async () => {
    if (!selectedPoint) {
      toast.error("Please select a location on the map");
      return;
    }

    try {
      await updateLocation(selectedPoint.latitude, selectedPoint.longitude);
      toast.success("Location updated");
      setLocationModalOpen(false);
    } catch (error) {
      toast.error("Failed to update location");
    }
  };

  return (
    <>
      <div className="w-full bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          to={"/"}
          className="text-2xl font-bold text-[#E23744] cursor-pointer"
        >
          FoodFleet
        </Link>

        <div className="flex items-center gap-4">
          <Link to={"/cart"} className="relative">
            <CgShoppingCart className="h-6 w-6 text-[#E23744]" />
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E23744] text-xs font-semibold text-white">
              {quauntity}
            </span>
          </Link>

          {isAuth ? (
            <Link to="/account" className="font-medium text-[#E23744]">
              Account
            </Link>
          ) : (
            <Link to="/Login" className="font-medium text-[#E23744]">
              Login
            </Link>
          )}
        </div>
      </div>

      {/* search bar */}
      {isHomePage && (
        <div className="border-t px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center rounded-lg border shadow-sm">
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-2 border-r px-3 text-gray-700 transition hover:bg-gray-50"
            >
              <BiMapPin className="h-4 w-4 text-[#E23744]" />
              <span className="max-w-35 truncate text-sm">{city}</span>
            </button>
            <div className="flex flex-1 items-center gap-2 px-3">
              <BiSearch className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for restaurant"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      )}
      </div>

      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Choose Your Location
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select automatically or click on the map to choose manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loadingLocation}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E23744] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d32f3a] disabled:opacity-60"
              >
                <LuLocateFixed size={16} />
                {loadingLocation ? "Detecting..." : "Use Current Location"}
              </button>

              <button
                type="button"
                onClick={handleConfirmManualLocation}
                disabled={loadingLocation || !selectedPoint}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Save Manual Selection
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <MapContainer
                center={[
                  selectedPoint?.latitude || location?.latitude || 28.6139,
                  selectedPoint?.longitude || location?.longitude || 77.209,
                ]}
                zoom={13}
                className="h-80 w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker
                  onPick={(latitude, longitude) =>
                    setSelectedPoint({ latitude, longitude })
                  }
                />
                {selectedPoint && (
                  <>
                    <RecenterMap
                      latitude={selectedPoint.latitude}
                      longitude={selectedPoint.longitude}
                    />
                    <Marker
                      position={[
                        selectedPoint.latitude,
                        selectedPoint.longitude,
                      ]}
                    />
                  </>
                )}
              </MapContainer>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Selected place</p>
              <p className="mt-1">{location?.formattedAddress || city}</p>
              {selectedPoint && (
                <p className="mt-2 text-xs text-slate-500">
                  Pin: {selectedPoint.latitude.toFixed(5)},{" "}
                  {selectedPoint.longitude.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
