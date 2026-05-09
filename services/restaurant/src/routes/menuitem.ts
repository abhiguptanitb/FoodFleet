import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import {
  addMenuItem,
  bulkUpdateMenuAvailability,
  deleteMenuItem,
  getAllItems,
  toggleMenuItemAvailability,
  updateMenuItem,
} from "../controllers/menuitem.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, isSeller, uploadFile, addMenuItem);
router.get("/all/:id", isAuth, getAllItems);
router.put("/bulk/availability", isAuth, isSeller, bulkUpdateMenuAvailability);
router.put("/:itemId", isAuth, isSeller, uploadFile, updateMenuItem);
router.delete("/:itemId", isAuth, isSeller, deleteMenuItem);
router.put("/status/:itemId", isAuth, isSeller, toggleMenuItemAvailability);

export default router;
