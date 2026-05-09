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
