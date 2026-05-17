import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../model/Rider.js";
import {
  validateLocationInput,
  validateRiderProfileInput,
} from "../utils/validation.js";

const getUserIdCandidates = (userId: unknown) => {
  const candidateIds = new Set<string>();

  if (typeof userId === "string" && userId.trim()) {
    candidateIds.add(userId.trim());
  }

  if (userId && typeof userId === "object") {
    const value = userId as {
      toString?: () => string;
      $oid?: string;
    };

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

const buildUserIdExpr = (field: string, userId: unknown) => ({
  $expr: {
    $in: [{ $toString: `$${field}` }, getUserIdCandidates(userId)],
  },
});

const syncRiderName = (rider: { riderName?: string }, name?: string) => {
  if (!rider.riderName?.trim() && name?.trim()) {
    rider.riderName = name.trim();
  }
};

export const addRiderProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can create rider profile",
      });
    }

    const [normalizedUserId] = getUserIdCandidates(user._id);
    const validation = validateRiderProfileInput(req.body, {
      requireLocation: true,
    });

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }
    const profileInput = validation.value!;

    if (!normalizedUserId) {
      return res.status(400).json({
        message: "Invalid rider account",
      });
    }

    const existingProfile = await Rider.findOne(
      buildUserIdExpr("userId", user._id)
    );

    if (existingProfile) {
      return res.status(400).json({
        message: "Rider profile already exists",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: "Rider Image is required",
      });
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer?.content) {
      return res.status(500).json({
        message: "Failed to generate image buffer",
      });
    }

    const { data: uploadResult } = await axios.post(
      `${process.env.UTILS_SERVICE}/api/upload`,
      {
        buffer: fileBuffer.content,
      }
    );

    const {
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      latitude,
      longitude,
    } = profileInput;

    const riderProfile = await Rider.create({
      userId: normalizedUserId,
      riderName: user.name,
      picture: uploadResult.url,
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      location: {
        type: "Point",
        coordinates: [longitude as number, latitude as number],
      },
      isAvailble: false,
      isVerified: false,
    });

    return res.status(201).json({
      message: "Rider profile created successfully",
      riderProfile,
    });
  }
);

export const fetchMyProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const account = await Rider.findOne(buildUserIdExpr("userId", user._id));

    res.json(account);
  }
);

export const toggleRiderAvailablity = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can create rider profile",
      });
    }

    const { isAvailble, latitude, longitude } = req.body;

    if (typeof isAvailble !== "boolean") {
      return res.status(400).json({
        message: "isAvailble must be boolean",
      });
    }

    const locationValidation = validateLocationInput(req.body);

    if (locationValidation.error) {
      return res.status(400).json({
        message: locationValidation.error,
      });
    }
    const locationInput = locationValidation.value!;

    const rider = await Rider.findOne(buildUserIdExpr("userId", user._id));

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    if (isAvailble && !rider.isVerified) {
      return res.status(403).json({
        message: "Rider is not verified",
      });
    }

    rider.isAvailble = isAvailble;
    syncRiderName(rider, user.name);

    rider.location = {
      type: "Point",
      coordinates: [locationInput.longitude, locationInput.latitude],
    };
    rider.lastActiveAt = new Date();

    await rider.save();

    res.json({
      message: isAvailble ? "Rider is now online" : "Rider is now offline",
      rider,
    });
  }
);

export const updateRiderLocation = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can update rider location",
      });
    }

    const locationValidation = validateLocationInput(req.body);

    if (locationValidation.error) {
      return res.status(400).json({
        message: locationValidation.error,
      });
    }
    const locationInput = locationValidation.value!;

    const rider = await Rider.findOne(buildUserIdExpr("userId", user._id));

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    rider.location = {
      type: "Point",
      coordinates: [locationInput.longitude, locationInput.latitude],
    };
    syncRiderName(rider, user.name);
    rider.lastActiveAt = new Date();

    await rider.save();

    res.json({
      message: "Rider location updated",
      rider,
    });
  }
);

export const acceptOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUserId = req.user?._id;
  const { orderId } = req.params;

  if (!riderUserId) {
    return res.status(400).json({
      message: "Please Login",
    });
  }

  const rider = await Rider.findOne({
    ...buildUserIdExpr("userId", riderUserId),
    isAvailble: true,
  });

  if (!rider) {
    return res.status(404).json({ message: "rider not found" });
  }

  try {
    const { data } = await axios.put(
      `${process.env.RESTAURANT_SERVICE}/api/order/assign/rider`,
      {
        orderId,
        riderId: rider._id.toString(),
        riderUserId: rider.userId,
        riderName: rider.riderName || req.user?.name || "Rider",
        riderImage: rider.picture,
        riderPhone: rider.phoneNumber,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    if (data.success) {
      const riderDetails = await Rider.findOneAndUpdate(
        {
          ...buildUserIdExpr("userId", riderUserId),
          isAvailble: true,
        },
        { isAvailble: false },
        { new: true }
      );

      res.json({ message: "Order accepted" });
    }
  } catch (error) {
    res.status(400).json({
      message: "Order already taken",
    });
  }
});

export const fetchMyCurrentOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
      return res.status(400).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({
      ...buildUserIdExpr("userId", riderUserId),
      isVerified: true,
    });

    if (!rider) {
      return res.status(404).json({ message: "rider not found" });
    }

    try {
      const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/current/rider?riderId=${rider._id}`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      res.json({
        order: data,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        return res.json({ order: null });
      }

      res.status(error.response?.status || 500).json({
        message:
          error.response?.data?.message || "Failed to fetch current order",
      });
    }
  }
);

export const updateRiderProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const rider = await Rider.findOne(buildUserIdExpr("userId", user._id));

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    const validation = validateRiderProfileInput(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }
    const profileInput = validation.value!;

    rider.phoneNumber = profileInput.phoneNumber;
    syncRiderName(rider, user.name);
    rider.aadharNumber = profileInput.aadharNumber;
    rider.drivingLicenseNumber = profileInput.drivingLicenseNumber;

    const file = req.file;
    if (file) {
      const fileBuffer = getBuffer(file);

      if (!fileBuffer?.content) {
        return res.status(500).json({
          message: "Failed to generate image buffer",
        });
      }

      const { data: uploadResult } = await axios.post(
        `${process.env.UTILS_SERVICE}/api/upload`,
        {
          buffer: fileBuffer.content,
        }
      );

      rider.picture = uploadResult.url;
    }

    rider.isVerified = false;
    rider.verificationStatus = "pending";
    rider.verificationNotes = "Updated documents submitted for review";
    rider.rejectReason = "";

    await rider.save();

    res.json({
      message: "Rider profile updated and sent for review",
      rider,
    });
  }
);

export const fetchNearbyAvailableOrders = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const riderUserId = req.user?._id;

    if (!riderUserId) {
      return res.status(400).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({
      ...buildUserIdExpr("userId", riderUserId),
      isVerified: true,
      isAvailble: true,
    });

    if (!rider) {
      return res.json({
        orders: [],
      });
    }

    const [longitude, latitude] = rider.location.coordinates;
    const { data } = await axios.get(
      `${process.env.RESTAURANT_SERVICE}/api/order/nearby-ready/rider`,
      {
        params: {
          latitude,
          longitude,
          radius: 500,
        },
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    res.json({
      orders: data.orders || [],
    });
  }
);

export const fetchRiderDashboardStats = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne(buildUserIdExpr("userId", userId));

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    const rangeParam = Array.isArray(req.query.range)
      ? req.query.range[0]
      : req.query.range;
    const range = typeof rangeParam === "string" ? rangeParam : "7d";

    const { data } = await axios.get(
      `${process.env.RESTAURANT_SERVICE}/api/order/stats/rider`,
      {
        params: {
          riderId: rider._id.toString(),
          range,
        },
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    res.json(data);
  }
);

export const fetchRiderOrderHistory = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne(buildUserIdExpr("userId", userId));

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    const rangeParam = Array.isArray(req.query.range)
      ? req.query.range[0]
      : req.query.range;
    const limitParam = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;
    const range = typeof rangeParam === "string" ? rangeParam : "30d";

    const { data } = await axios.get(
      `${process.env.RESTAURANT_SERVICE}/api/order/history/rider`,
      {
        params: {
          riderId: rider._id.toString(),
          range,
          limit: limitParam || 20,
        },
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );

    res.json(data);
  }
);

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne(buildUserIdExpr("userId", userId));

    if (!rider) {
      return res.status(404).json({
        message: "Please Login",
      });
    }

    const { orderId } = req.params;

    try {
      const { data } = await axios.put(
        `${process.env.RESTAURANT_SERVICE}/api/order/update/status/rider`,
        { orderId },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      res.json({
        message: data.message,
      });
    } catch (error: any) {
      res.status(500).json({
        message: error.response.data.message,
      });
    }
  }
);
