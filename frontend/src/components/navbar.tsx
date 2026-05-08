import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { FiLogOut } from "react-icons/fi";
import { getRoleHomePath } from "../utils/roleRoutes";

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
    user,
    setIsAuth,
    setUser,
    city,
    quauntity,
    location,
    loadingLocation,
    updateLocation,
    refreshCurrentLocation,
  } = useAppData();
  const currLocation = useLocation();
  const navigate = useNavigate();

  const homePath = getRoleHomePath(user?.role);
  const isHomePage =
    currLocation.pathname === "/browse" ||
    currLocation.pathname === "/customer" ||
    currLocation.pathname === "/";
  const isLoginPage = currLocation.pathname.toLowerCase() === "/login";
  const isCustomer = !user?.role || user.role === "customer";
  const roleLabels: Record<string, string> = {
    customer: "Guest Dining",
    seller: "Restaurant Partner",
    rider: "Delivery Partner",
    admin: "Admin Console",
  };
  const roleLabel = isLoginPage
    ? "Welcome"
    : user?.role
      ? roleLabels[user.role] ||
        `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`
      : roleLabels.customer;
  const dashboardLabel =
    user?.role === "seller"
      ? "Seller Dashboard"
      : user?.role === "rider"
        ? "Rider Dashboard"
        : user?.role === "admin"
          ? "Admin Panel"
          : "My Account";
  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || "F";

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

  const logoutHandler = () => {
    localStorage.setItem("token", "");
    localStorage.removeItem("sellerActiveRestaurantId");
    setUser(null);
    setIsAuth(false);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <>
      <div className={`neon-nav sticky top-0 z-40 ${isLoginPage ? "login-nav" : ""}`}>
        <div className="page-wrap">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <Link
              to={homePath}
              className="flex items-center gap-3 text-2xl font-black text-[var(--text)]"
            >
              <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-2xl text-lg text-white">
                F
              </span>
              FoodFleet
            </Link>

            <div className="order-2 mr-auto flex min-w-0 sm:order-none sm:mr-0">
              <span className="role-badge max-w-[150px] truncate sm:max-w-none">
                {roleLabel}
              </span>
            </div>

            {isHomePage && isCustomer && (
              <div className="order-3 flex w-full flex-col gap-2 lg:order-2 lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:px-4">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="flex items-center gap-3 rounded-2xl border-2 border-[var(--text)] bg-white px-3 py-2 text-left text-[var(--text)] shadow-[3px_3px_0_var(--accent-2)] hover:bg-[var(--accent-soft)] lg:min-w-[220px]"
                >
                  <BiMapPin className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                      Delivering To
                    </p>
                    <span className="block truncate text-sm font-medium">
                      {city}
                    </span>
                  </div>
                </button>

                <div className="flex flex-1 items-center gap-3 rounded-2xl border-2 border-[var(--text)] bg-white px-3 py-2.5 shadow-[3px_3px_0_var(--accent-3)]">
                  <BiSearch className="h-5 w-5 text-[var(--accent)]" />
                  <input
                    type="text"
                    placeholder="Search restaurants or cuisines"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#7b8790]"
                  />
                </div>
              </div>
            )}

            {!isLoginPage && (
              <div className="order-2 flex items-center gap-3 lg:order-3">
                {isAuth && isCustomer && (
                  <Link
                    to={"/cart"}
                    className="nav-action relative flex h-12 w-12 items-center justify-center rounded-2xl hover:-translate-y-0.5"
                  >
                    <CgShoppingCart className="h-6 w-6" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--text)] bg-[var(--accent)] text-[11px] font-semibold text-white">
                      {quauntity}
                    </span>
                  </Link>
                )}

                {isAuth ? (
                  isCustomer ? (
                    <Link
                      to="/account"
                      className="nav-action rounded-2xl px-4 py-3 text-sm font-semibold hover:-translate-y-0.5"
                    >
                      {dashboardLabel}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        to={homePath}
                        className="nav-action flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 hover:-translate-y-0.5"
                      >
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="h-9 w-9 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-black text-white">
                            {firstLetter}
                          </span>
                        )}
                        <span className="hidden min-w-0 text-left md:block">
                          <span className="block max-w-[170px] truncate text-sm font-black">
                            {user?.name || dashboardLabel}
                          </span>
                          <span className="block max-w-[170px] truncate text-[11px] font-medium text-[var(--text-soft)]">
                            {user?.email || dashboardLabel}
                          </span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={logoutHandler}
                        className="nav-action flex h-12 w-12 items-center justify-center rounded-2xl hover:-translate-y-0.5"
                        aria-label="Logout"
                      >
                        <FiLogOut className="h-5 w-5" />
                      </button>
                    </div>
                  )
                ) : (
                <Link
                  to="/Login"
                  className="brand-button px-4 py-3 text-sm font-semibold"
                >
                  Sign In
                </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-3xl rounded-[32px] border border-white/70 bg-[#f8fbff] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.25)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="pill-label">Location</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  Choose your delivery area
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use your current position or tap the map to pin the delivery spot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="ghost-button rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loadingLocation}
                className="brand-button px-4 py-3 text-sm font-semibold disabled:opacity-60"
              >
                <LuLocateFixed size={16} />
                {loadingLocation ? "Detecting..." : "Use Current Location"}
              </button>

              <button
                type="button"
                onClick={handleConfirmManualLocation}
                disabled={loadingLocation || !selectedPoint}
                className="ghost-button px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Save Pinned Location
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
