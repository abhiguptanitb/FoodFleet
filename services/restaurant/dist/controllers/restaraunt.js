import axios from "axios";
import getBuffer from "../config/datauri.js";
import TryCatch from "../middlewares/trycatch.js";
import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import Restaurant from "../models/Restaurant.js";
import jwt from "jsonwebtoken";
const ACCESS_TOKEN_EXPIRES_IN = "30m";
const getUserIdCandidates = (userId) => {
    const candidateIds = new Set();
    if (typeof userId === "string" && userId.trim()) {
        candidateIds.add(userId.trim());
    }
    if (userId && typeof userId === "object") {
        const value = userId;
        if (typeof value.$oid === "string" && value.$oid.trim()) {
            candidateIds.add(value.$oid.trim());
        }
        if (typeof value.toString === "function") {
            const stringValue = value.toString();
            if (stringValue && stringValue !== "[object Object]") {
                candidateIds.add(stringValue);
            }
        }
    }
    return Array.from(candidateIds);
};
const buildUserIdExpr = (field, userId) => ({
    $expr: {
        $in: [{ $toString: `$${field}` }, getUserIdCandidates(userId)],
    },
});
const serializeUserForToken = (user) => ({
    _id: getUserIdCandidates(user._id)[0] || "",
    name: user.name || "",
    email: user.email || "",
    image: user.image || "",
    role: user.role || null,
    restaurantId: getUserIdCandidates(user.restaurantId)[0] || "",
});
export const addRestraunt = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { name, description, latitude, longitude, formattedAddress, phone, cuisine, deliveryTimeMinutes, priceRange, rating, } = req.body;
    const [normalizedOwnerId] = getUserIdCandidates(user._id);
    if (!name || !latitude || !longitude || !normalizedOwnerId) {
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
    const restaurantPayload = {
        name,
        description,
        phone,
        image: uploadResult.url,
        ownerId: normalizedOwnerId,
        autoLocation: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
            formattedAddress,
        },
        isVerified: false,
        verificationStatus: "pending",
        cuisine: cuisine || "Mixed",
        priceRange: ["budget", "mid", "premium"].includes(priceRange)
            ? priceRange
            : "mid",
    };
    if (deliveryTimeMinutes) {
        restaurantPayload.deliveryTimeMinutes = Number(deliveryTimeMinutes);
    }
    if (rating && !Number.isNaN(Number(rating))) {
        const parsedRating = Number(rating);
        if (parsedRating >= 0 && parsedRating <= 5) {
            restaurantPayload.rating = parsedRating;
        }
    }
    const restaurant = await Restaurant.create(restaurantPayload);
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
    const sellerRestaurants = await Restaurant.find(buildUserIdExpr("ownerId", req.user._id))
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
        const serializedUser = serializeUserForToken({
            ...req.user,
            restaurantId: restaurant._id.toString(),
        });
        const token = jwt.sign({
            user: serializedUser,
        }, process.env.JWT_SEC, {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
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
    const restaurants = await Restaurant.find(buildUserIdExpr("ownerId", req.user._id)).sort({
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
        ...buildUserIdExpr("ownerId", req.user._id),
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
    const { name, description, cuisine, deliveryTimeMinutes, priceRange, phone, rating, } = req.body;
    const restaurantId = req.body.restaurantId || req.user.restaurantId;
    const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        ...buildUserIdExpr("ownerId", req.user._id),
    });
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    restaurant.name = name;
    restaurant.description = description;
    if (phone) {
        restaurant.phone = Number(phone);
    }
    restaurant.cuisine = cuisine || restaurant.cuisine;
    if (deliveryTimeMinutes) {
        restaurant.deliveryTimeMinutes = Number(deliveryTimeMinutes);
    }
    if (rating && !Number.isNaN(Number(rating))) {
        const parsedRating = Number(rating);
        if (parsedRating >= 0 && parsedRating <= 5) {
            restaurant.rating = parsedRating;
        }
    }
    restaurant.priceRange = ["budget", "mid", "premium"].includes(priceRange)
        ? priceRange
        : restaurant.priceRange;
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
    const { latitude, longitude, radius = 5000, search = "", cuisine, openNow, minRating, maxDeliveryTime, priceRange, } = req.query;
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
    if (typeof cuisine === "string" && cuisine && cuisine !== "all") {
        query.cuisine = cuisine;
    }
    if (openNow === "true") {
        query.isOpen = true;
    }
    if (typeof minRating === "string" && minRating !== "all") {
        query.rating = { $gte: Number(minRating) };
    }
    if (typeof maxDeliveryTime === "string" && maxDeliveryTime !== "all") {
        query.deliveryTimeMinutes = { $lte: Number(maxDeliveryTime) };
    }
    if (typeof priceRange === "string" && priceRange !== "all") {
        query.priceRange = priceRange;
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
export const fetchFavoriteRestaurants = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Please Login" });
    }
    const favorites = await FavoriteRestaurant.find({
        userId: req.user._id.toString(),
    }).populate("restaurantId");
    res.json({
        favorites,
        restaurantIds: favorites.map((favorite) => favorite.restaurantId._id.toString()),
    });
});
export const saveFavoriteRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Please Login" });
    }
    const { restaurantId } = req.body;
    if (!restaurantId) {
        return res.status(400).json({ message: "Restaurant id is required" });
    }
    await FavoriteRestaurant.findOneAndUpdate({ userId: req.user._id.toString(), restaurantId }, { $setOnInsert: { userId: req.user._id.toString(), restaurantId } }, { upsert: true, new: true });
    res.json({ message: "Restaurant saved" });
});
export const removeFavoriteRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Please Login" });
    }
    const restaurantId = typeof req.params.restaurantId === "string"
        ? req.params.restaurantId
        : "";
    await FavoriteRestaurant.deleteOne({
        userId: req.user._id.toString(),
        restaurantId,
    });
    res.json({ message: "Restaurant removed from saved list" });
});
