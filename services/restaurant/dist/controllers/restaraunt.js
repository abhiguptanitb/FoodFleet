import axios from "axios";
import getBuffer from "../config/datauri.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import jwt from "jsonwebtoken";
export const addRestraunt = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { name, description, latitude, longitude, formattedAddress, phone } = req.body;
    if (!name || !latitude || !longitude) {
        return res.status(400).json({
            message: "Please give all details",
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
    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer: fileBuffer.content,
    });
    const restaurant = await Restaurant.create({
        name,
        description,
        phone,
        image: uploadResult.url,
        ownerId: user._id,
        autoLocation: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
            formattedAddress,
        },
        isVerified: false,
    });
    return res.status(201).json({
        message: "Restaurant created successfully",
        restaurant,
    });
});
export const fetchMyRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Please Login",
        });
    }
    const sellerRestaurants = await Restaurant.find({ ownerId: req.user._id })
        .sort({ createdAt: -1 })
        .lean();
    if (sellerRestaurants.length === 0) {
        return res.status(400).json({
            message: "No Restaurant found",
        });
    }
    const requestedRestaurantId = typeof req.query.restaurantId === "string"
        ? req.query.restaurantId
        : req.user.restaurantId;
    const restaurant = sellerRestaurants.find((currentRestaurant) => currentRestaurant._id.toString() === requestedRestaurantId) || sellerRestaurants[0];
    if (!restaurant) {
        return res.status(400).json({
            message: "No Restaurant found",
        });
    }
    if (!req.user.restaurantId || req.user.restaurantId !== restaurant._id.toString()) {
        const token = jwt.sign({
            user: {
                ...req.user,
                restaurantId: restaurant._id.toString(),
            },
        }, process.env.JWT_SEC, {
            expiresIn: "15d",
        });
        return res.json({ restaurant, token });
    }
    res.json({ restaurant });
});
export const fetchMyRestaurants = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Please Login",
        });
    }
    const restaurants = await Restaurant.find({ ownerId: req.user._id }).sort({
        createdAt: -1,
    });
    res.json({ restaurants });
});
export const updateStatusRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(403).json({
            message: "Please Login",
        });
    }
    const { status } = req.body;
    if (typeof status !== "boolean") {
        return res.status(400).json({
            message: "Status must be boolean",
        });
    }
    const restaurantId = req.body.restaurantId || req.user.restaurantId;
    const restaurant = await Restaurant.findOneAndUpdate({
        _id: restaurantId,
        ownerId: req.user._id,
    }, { isOpen: status }, { new: true });
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    res.json({
        message: "Restaurant status Updated",
        restaurant,
    });
});
export const updateRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(403).json({
            message: "Please Login",
        });
    }
    const { name, description } = req.body;
    const restaurantId = req.body.restaurantId || req.user.restaurantId;
    const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        ownerId: req.user._id,
    });
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    restaurant.name = name;
    restaurant.description = description;
    const file = req.file;
    if (file) {
        const fileBuffer = getBuffer(file);
        if (!fileBuffer?.content) {
            return res.status(500).json({
                message: "Failed to create file buffer",
            });
        }
        const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
            buffer: fileBuffer.content,
        });
        restaurant.image = uploadResult.url;
    }
    await restaurant.save();
    res.json({
        message: "Restaurant Updated",
        restaurant,
    });
});
export const getNearbyRestaurant = TryCatch(async (req, res) => {
    const { latitude, longitude, radius = 5000, search = "" } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({
            message: "Latitude and longitude are required",
        });
    }
    const query = {
        isVerified: true,
    };
    if (search && typeof search === "string") {
        query.name = { $regex: search, $options: "i" };
    }
    const restaurants = await Restaurant.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [Number(longitude), Number(latitude)],
                },
                distanceField: "distance",
                maxDistance: Number(radius),
                spherical: true,
                query,
            },
        },
        {
            $sort: {
                isOpen: -1,
                distance: 1,
            },
        },
        {
            $addFields: {
                distanceKm: {
                    $round: [{ $divide: ["$distance", 1000] }, 2],
                },
            },
        },
    ]);
    res.json({
        success: true,
        count: restaurants.length,
        restaurants,
    });
});
export const fetchSingleRestaurant = TryCatch(async (req, res) => {
    const restaurant = await Restaurant.findById(req.params.id);
    res.json(restaurant);
});
