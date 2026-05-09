import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import {
  deleteCustomer,
  getAdminAuditHistory,
  getCustomers,
  getPendingRestaurant,
  getPendingRiders,
  verifyRestaurant,
  verifyRider,
} from "../controllers/admin.js";

const router = express.Router();

router.get("/admin/restaurant/pending", isAuth, isAdmin, getPendingRestaurant);
router.get("/admin/rider/pending", isAuth, isAdmin, getPendingRiders);
router.get("/admin/customers", isAuth, isAdmin, getCustomers);
router.get("/admin/audit", isAuth, isAdmin, getAdminAuditHistory);
router.delete("/admin/customers/:id", isAuth, isAdmin, deleteCustomer);
router.patch("/verify/rider/:id", isAuth, isAdmin, verifyRider);
router.patch("/verify/restaurant/:id", isAuth, isAdmin, verifyRestaurant);

export default router;
