import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import { getAddressCollection, getCartCollection, getOrderCollection, getRestaurantCollection, getRiderCollection, getUserCollection, } from "../util/collection.js";
export const getPendingRestaurant = TryCatch(async (req, res) => {
    const restaurants = await (await getRestaurantCollection())
        .find({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray();
    res.json({
        count: restaurants.length,
        restaurants,
    });
});
export const getPendingRiders = TryCatch(async (req, res) => {
    const usersCollection = await getUserCollection();
    const riders = await (await getRiderCollection())
        .aggregate([
        {
            $addFields: {
                userObjectId: { $toObjectId: "$userId" },
            },
        },
        {
            $lookup: {
                from: usersCollection.collectionName,
                localField: "userObjectId",
                foreignField: "_id",
                as: "user",
            },
        },
        {
            $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                userObjectId: 0,
                "user.password": 0,
            },
        },
        {
            $sort: {
                updatedAt: -1,
                createdAt: -1,
            },
        },
    ])
        .toArray();
    res.json({
        count: riders.length,
        riders,
    });
});
export const getCustomers = TryCatch(async (req, res) => {
    const customers = await (await getUserCollection())
        .find({ role: "customer" })
        .sort({ updatedAt: -1, createdAt: -1 })
        .project({ password: 0 })
        .toArray();
    res.json({
        count: customers.length,
        customers,
    });
});
export const deleteCustomer = TryCatch(async (req, res) => {
    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(400).json({
            message: "invalid customer id",
        });
    }
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Invalid object id",
        });
    }
    const userObjectId = new ObjectId(id);
    const usersCollection = await getUserCollection();
    const customer = await usersCollection.findOne({
        _id: userObjectId,
        role: "customer",
    });
    if (!customer) {
        return res.status(404).json({
            message: "Customer not found",
        });
    }
    const userId = userObjectId.toString();
    const ordersResult = await (await getOrderCollection()).deleteMany({ userId });
    const cartsResult = await (await getCartCollection()).deleteMany({
        $or: [{ userId }, { userId: userObjectId }],
    });
    const addressesResult = await (await getAddressCollection()).deleteMany({
        userId,
    });
    const userResult = await usersCollection.deleteOne({
        _id: userObjectId,
        role: "customer",
    });
    if (userResult.deletedCount === 0) {
        return res.status(404).json({
            message: "Customer not found",
        });
    }
    res.json({
        message: "Customer and related records deleted successfully",
        deleted: {
            customers: userResult.deletedCount,
            orders: ordersResult.deletedCount,
            carts: cartsResult.deletedCount,
            addresses: addressesResult.deletedCount,
        },
    });
});
export const verifyRestaurant = TryCatch(async (req, res) => {
    const { id } = req.params;
    const nextStatus = typeof req.body?.isVerified === "boolean" ? req.body.isVerified : true;
    if (typeof id !== "string") {
        return res.status(400).json({
            message: "invalid restaurant id",
        });
    }
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Invalid object id",
        });
    }
    const result = await (await getRestaurantCollection()).updateOne({ _id: new ObjectId(id) }, {
        $set: {
            isVerified: nextStatus,
            updatedAt: new Date(),
        },
    });
    if (result.matchedCount === 0) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    res.json({
        message: `Restaurant ${nextStatus ? "verified" : "unverified"} successfully`,
    });
});
export const verifyRider = TryCatch(async (req, res) => {
    const { id } = req.params;
    const nextStatus = typeof req.body?.isVerified === "boolean" ? req.body.isVerified : true;
    if (typeof id !== "string") {
        return res.status(400).json({
            message: "invalid rider id",
        });
    }
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Invalid object id",
        });
    }
    const result = await (await getRiderCollection()).updateOne({ _id: new ObjectId(id) }, {
        $set: {
            isVerified: nextStatus,
            updatedAt: new Date(),
        },
    });
    if (result.matchedCount === 0) {
        return res.status(404).json({
            message: "rider not found",
        });
    }
    res.json({
        message: `Rider ${nextStatus ? "verified" : "unverified"} successfully`,
    });
});
