import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import {
  getAddressCollection,
  getAdminAuditCollection,
  getCartCollection,
  getOrderCollection,
  getRestaurantCollection,
  getRiderCollection,
  getUserCollection,
} from "../util/collection.js";

const createAudit = async ({
  actorId,
  action,
  entityType,
  entityId,
  notes,
}: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  notes?: string;
}) => {
  await (await getAdminAuditCollection()).insertOne({
    actorId,
    action,
    entityType,
    entityId,
    notes,
    createdAt: new Date(),
  });
};

export const getPendingRestaurant = TryCatch(async (req, res) => { //getRestaurantsByVerificationStatus
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const query =
    status === "pending"
      ? { $or: [{ verificationStatus: "pending" }, { verificationStatus: { $exists: false }, isVerified: false }] }
      : status === "verified"
        ? { $or: [{ verificationStatus: "verified" }, { isVerified: true }] }
        : status === "rejected"
          ? { verificationStatus: "rejected" }
          : {};

  const restaurants = await (await getRestaurantCollection())
    .find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  res.json({
    count: restaurants.length,
    restaurants,
  });
});

export const getPendingRiders = TryCatch(async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const match =
    status === "pending"
      ? { $or: [{ verificationStatus: "pending" }, { verificationStatus: { $exists: false }, isVerified: false }] }
      : status === "verified"
        ? { $or: [{ verificationStatus: "verified" }, { isVerified: true }] }
        : status === "rejected"
          ? { verificationStatus: "rejected" }
          : {};
  const usersCollection = await getUserCollection();
  const riders = await (await getRiderCollection())
    .aggregate([
      {
        $match: match,
      },
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

  await createAudit({
    actorId: (req as any).user?._id?.toString(),
    action: "delete_customer",
    entityType: "customer",
    entityId: id,
    notes: req.body?.notes,
  });

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
  const nextStatus =
    typeof req.body?.isVerified === "boolean" ? req.body.isVerified : true;
  const verificationStatus =
    req.body?.verificationStatus ||
    (nextStatus ? "verified" : req.body?.rejectReason ? "rejected" : "pending");
  const rejectReason = req.body?.rejectReason || "";
  const verificationNotes = req.body?.verificationNotes || "";

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
        verificationStatus,
        rejectReason,
        verificationNotes,
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

  await createAudit({
    actorId: (req as any).user?._id?.toString(),
    action: `restaurant_${verificationStatus}`,
    entityType: "restaurant",
    entityId: id,
    notes: rejectReason || verificationNotes,
  });
});

export const verifyRider = TryCatch(async (req, res) => {
  const { id } = req.params;
  const nextStatus =
    typeof req.body?.isVerified === "boolean" ? req.body.isVerified : true;
  const verificationStatus =
    req.body?.verificationStatus ||
    (nextStatus ? "verified" : req.body?.rejectReason ? "rejected" : "pending");
  const rejectReason = req.body?.rejectReason || "";
  const verificationNotes = req.body?.verificationNotes || "";

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
        verificationStatus,
        rejectReason,
        verificationNotes,
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

  await createAudit({
    actorId: (req as any).user?._id?.toString(),
    action: `rider_${verificationStatus}`,
    entityType: "rider",
    entityId: id,
    notes: rejectReason || verificationNotes,
  });
});

export const getAdminAuditHistory = TryCatch(async (req, res) => {
  const audits = await (await getAdminAuditCollection())
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  res.json({ audits });
});
