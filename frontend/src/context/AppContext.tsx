import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService, restaurantService } from "../main";
import type { AppContextType, ICart, LocationData, User } from "../types";
import { Toaster } from "react-hot-toast";

const AppContext = createContext<AppContextType | undefined>(undefined);
const LOCATION_STORAGE_KEY = "foodfleet_selected_location";

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [city, setCity] = useState("Fecthing Location...");

  const getCityLabel = (data: any) =>
    data?.address?.city ||
    data?.address?.town ||
    data?.address?.village ||
    data?.address?.state_district ||
    "Your Location";

  const persistLocation = (nextLocation: LocationData, nextCity: string) => {
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({
        ...nextLocation,
        city: nextCity,
      })
    );
  };

  const updateLocation = async (latitude: number, longitude: number) => {
    setLoadingLocation(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await res.json();

      const nextLocation = {
        latitude,
        longitude,
        formattedAddress: data.display_name || "Current Location",
      };
      const nextCity = getCityLabel(data);

      setLocation(nextLocation);
      setCity(nextCity);
      persistLocation(nextLocation, nextCity);
    } catch (error) {
      const nextLocation = {
        latitude,
        longitude,
        formattedAddress: "Current Location",
      };

      setLocation(nextLocation);
      setCity("Failed to load");
      persistLocation(nextLocation, "Failed to load");
    } finally {
      setLoadingLocation(false);
    }
  };

  const refreshCurrentLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported");
    }

    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await updateLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (error) => reject(error)
      );
    });
  };

  async function fetchUser() {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${authService}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(data);
      setIsAuth(true);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const [cart, setCart] = useState<ICart[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quauntity, setQuauntity] = useState(0);

  async function fetchCart() {
    if (!user || user.role !== "customer") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCart(data.cart || []);
      setSubTotal(data.subtotal || 0);
      setQuauntity(data.cartLength);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    }
  }, [user]);

  useEffect(() => {
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);

    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocation({
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          formattedAddress: parsed.formattedAddress,
        });
        setCity(parsed.city || "Your Location");
        return;
      } catch (error) {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }

    refreshCurrentLocation().catch(() => {
      setCity("Location unavailable");
      setLoadingLocation(false);
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        isAuth,
        loading,
        setIsAuth,
        setLoading,
        setUser,
        user,
        location,
        loadingLocation,
        city,
        updateLocation,
        refreshCurrentLocation,
        cart,
        fetchCart,
        quauntity,
        subTotal,
      }}
    >
      {children}

      <Toaster />
    </AppContext.Provider>
  );
};

export const useAppData = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};
