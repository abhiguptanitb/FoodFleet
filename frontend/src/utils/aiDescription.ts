import axios from "axios";
import { restaurantService } from "../main";

export type AiDescriptionPayload = {
  type: "restaurant" | "menu item";
  name?: string;
  cuisine?: string;
  category?: string;
  keywords?: string;
  currentDescription?: string;
};

export const generateAiDescription = async (
  payload: AiDescriptionPayload
) => {
  const { data } = await axios.post(
    `${restaurantService}/api/ai/generate-description`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  return String(data.description || "").trim();
};

export type SmartFoodSearchResult = {
  searchText: string;
  cuisine: string;
  priceRange: "all" | "budget" | "mid" | "premium";
  maxDeliveryTime: "all" | "25" | "35" | "45";
  minRating: "all" | "4" | "4.3" | "4.5";
  openNow: boolean;
  keywords: string[];
  explanation: string;
  provider?: string;
};

export type SellerPerformanceInsight = {
  summary: string;
  opportunities: string[];
  actions: string[];
  provider?: string;
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const generateSmartFoodSearch = async (query: string) => {
  const { data } = await axios.post<SmartFoodSearchResult>(
    `${restaurantService}/api/ai/smart-food-search`,
    { query },
    {
      headers: authHeaders(),
    }
  );

  return data;
};

export const generateSellerPerformanceInsight = async (payload: {
  restaurantName: string;
  stats: unknown;
  performance: unknown;
  menuItems: unknown[];
}) => {
  const { data } = await axios.post<SellerPerformanceInsight>(
    `${restaurantService}/api/ai/seller-performance-insight`,
    payload,
    {
      headers: authHeaders(),
    }
  );

  return data;
};
