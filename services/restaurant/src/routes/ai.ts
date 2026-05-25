import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import {
  generateDescription,
  sellerPerformanceInsight,
  smartFoodSearch,
} from "../controllers/ai.js";

const router = express.Router();

router.post("/generate-description", isAuth, isSeller, generateDescription);
router.post("/smart-food-search", isAuth, smartFoodSearch);
router.post(
  "/seller-performance-insight",
  isAuth,
  isSeller,
  sellerPerformanceInsight
);

export default router;
