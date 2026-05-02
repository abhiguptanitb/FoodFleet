import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { assignRiderToOrder, createOrder, fetchOrderForPayment, fetchRestaurantOrders, fetchSingleOrder, getCurrentOrderForRider, getNearbyReadyOrdersForRider, getRiderDeliveredStats, getMyOrders, updateOrderStatus, updateOrderStatusRider, getRestaurantSalesStats, } from "../controllers/order.js";
const router = express.Router();
router.get("/myorder", isAuth, getMyOrders);
router.get("/:id", isAuth, fetchSingleOrder);
router.post("/new", isAuth, createOrder);
router.get("/payment/:id", fetchOrderForPayment);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
// 📊 Sales Stats endpoint - should be before the single order endpoint
router.get("/stats/sales/:restaurantId", isAuth, isSeller, getRestaurantSalesStats);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);
router.put("/assign/rider", assignRiderToOrder);
router.get("/current/rider", getCurrentOrderForRider);
router.get("/nearby-ready/rider", getNearbyReadyOrdersForRider);
router.get("/stats/rider", getRiderDeliveredStats);
router.put("/update/status/rider", updateOrderStatusRider);
export default router;
