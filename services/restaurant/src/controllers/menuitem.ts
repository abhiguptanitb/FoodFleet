import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";

const parseJsonArray = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please login",
    });
  }

  const restaurantId = req.body.restaurantId || req.user.restaurantId;

  const restaurant = await Restaurant.findOne({
    _id: restaurantId,
    ownerId: req.user._id,
  });

  if (!restaurant) {
    return res.status(404).json({
      message: "NO Restaurant found",
    });
  }

  const { name, description, price, category } = req.body;

  if (!name || !price) {
    return res.status(400).json({
      message: "Name and price are required",
    });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Please give image",
    });
  }

  const fileBuffer = getBuffer(file);

  if (!fileBuffer?.content) {
    return res.status(500).json({
      message: "Failed to create file buffer",
    });
  }

  const { data: uploadResult } = await axios.post(
    `${process.env.UTILS_SERVICE}/api/upload`,
    {
      buffer: fileBuffer.content,
    }
  );

  const item = await MenuItems.create({
    name,
    description,
    price,
    restaurantId: restaurant._id,
    image: uploadResult.url,
    category: category || "Popular",
    variants: parseJsonArray(req.body.variants),
    addOns: parseJsonArray(req.body.addOns),
  });

  res.json({
    message: "Item Added Successfully",
    item,
  });
});

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      message: "Id is required",
    });
  }
  const items = await MenuItems.find({ restaurantId: id });
  res.json(items);
});

export const updateMenuItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({
        message: "Id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    const { name, description, price, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    item.name = name;
    item.description = description || "";
    item.price = Number(price);
    item.category = category || item.category || "Popular";
    item.variants = parseJsonArray(req.body.variants);
    item.addOns = parseJsonArray(req.body.addOns);

    const file = req.file;

    if (file) {
      const fileBuffer = getBuffer(file);

      if (!fileBuffer?.content) {
        return res.status(500).json({
          message: "Failed to create file buffer",
        });
      }

      const { data: uploadResult } = await axios.post(
        `${process.env.UTILS_SERVICE}/api/upload`,
        {
          buffer: fileBuffer.content,
        }
      );

      item.image = uploadResult.url;
    }

    await item.save();

    res.json({
      message: "Item updated successfully",
      item,
    });
  }
);

export const bulkUpdateMenuAvailability = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { restaurantId, itemIds, isAvailable } = req.body;

    if (!restaurantId || !Array.isArray(itemIds) || typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "Restaurant, item ids, and availability are required",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    const result = await MenuItems.updateMany(
      {
        _id: { $in: itemIds },
        restaurantId,
      },
      { $set: { isAvailable } }
    );

    res.json({
      message: `Updated ${result.modifiedCount} items`,
      modifiedCount: result.modifiedCount,
    });
  }
);

export const deleteMenuItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({
        message: "Id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    await item.deleteOne();

    res.json({
      message: "Menu item deleted successfully",
    });
  }
);

export const toggleMenuItemAvailability = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({
        message: "Id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    res.json({
      message: `Item Marked as ${
        item.isAvailable ? "available" : "unavailable"
      }`,
      item,
    });
  }
);
