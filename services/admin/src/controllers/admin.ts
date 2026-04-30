import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import {
  getRestaurantCollection,
  getRiderCollection,
  getUserCollection,
} from "../util/collection.js";

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

export const verifyRestaurant = TryCatch(async (req, res) => {
  const { id } = req.params;
  const nextStatus =
    typeof req.body?.isVerified === "boolean" ? req.body.isVerified : true;

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

  const result = await (
    await getRestaurantCollection()
  ).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVerified: nextStatus,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  res.json({
    message: `Restaurant ${
      nextStatus ? "verified" : "unverified"
    } successfully`,
  });
});

export const verifyRider = TryCatch(async (req, res) => {
  const { id } = req.params;
  const nextStatus =
    typeof req.body?.isVerified === "boolean" ? req.body.isVerified : true;

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

  const result = await (
    await getRiderCollection()
  ).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isVerified: nextStatus,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      message: "rider not found",
    });
  }

  res.json({
    message: `Rider ${nextStatus ? "verified" : "unverified"} successfully`,
  });
});
