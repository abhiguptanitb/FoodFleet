import User from "../model/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { oauth2client } from "../config/googleConfig.js";
import axios from "axios";

const ACCESS_TOKEN_EXPIRES_IN = "30m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REFRESH_COOKIE_NAME = "foodfleet_refresh_token";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const getRefreshSecret = () =>
  process.env.REFRESH_JWT_SEC || `${process.env.JWT_SEC}:refresh`;

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" as const : "lax" as const,
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/auth",
  };
};

const parseCookies = (cookieHeader?: string) =>
  (cookieHeader || "").split(";").reduce<Record<string, string>>((cookies, item) => {
    const [rawName, ...rest] = item.trim().split("=");
    if (!rawName || rest.length === 0) return cookies;
    cookies[rawName] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});

const normalizeId = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === "object") {
    const candidate = value as {
      toString?: () => string;
      $oid?: string;
    };

    if (typeof candidate.$oid === "string" && candidate.$oid.trim()) {
      return candidate.$oid.trim();
    }

    if (typeof candidate.toString === "function") {
      const stringValue = candidate.toString();
      if (stringValue && stringValue !== "[object Object]") {
        return stringValue;
      }
    }
  }

  return "";
};

const serializeUserForToken = (user: {
  _id: unknown;
  name?: string;
  email?: string;
  image?: string;
  role?: string | null;
  restaurantId?: unknown;
}) => ({
  _id: normalizeId(user._id),
  name: user.name || "",
  email: user.email || "",
  image: user.image || "",
  role: user.role || null,
  restaurantId: normalizeId(user.restaurantId),
});

const createAccessToken = (user: ReturnType<typeof serializeUserForToken>) =>
  jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

const createRefreshToken = (userId: string) =>
  jwt.sign({ userId }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

const setRefreshCookie = (res: any, userId: string) => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    createRefreshToken(userId),
    getCookieOptions()
  );
};

const clearRefreshCookie = (res: any) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: undefined,
  });
};

const allowedRoles = ["customer", "rider", "seller"] as const;
const allowedLoginRoles = [...allowedRoles, "admin"] as const;
type Role = (typeof allowedRoles)[number];
type LoginRole = (typeof allowedLoginRoles)[number];

export const loginUser = TryCatch(async (req, res) => {
  const { code, role } = req.body as { code?: string; role?: LoginRole };

  if (!code) {
    return res.status(400).json({
      message: "Authorization code is required",
    });
  }

  if (role && !allowedLoginRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const googleRes = await oauth2client.getToken(code);

  oauth2client.setCredentials(googleRes.tokens);

  const userRes = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
  );
  const { email, name, picture } = userRes.data;

  let user = await User.findOne({ email });

  if (!user) {
    if (role === "admin") {
      return res.status(403).json({
        message: "Admin access is restricted to approved accounts.",
      });
    }

    user = await User.create({
      name,
      email,
      image: picture,
      ...(role ? { role } : {}),
    });
  } else {
    if (role === "admin" && user.role !== "admin") {
      return res.status(403).json({
        message: "This email is not approved for admin access.",
      });
    }

    if (role && user.role && user.role !== role) {
      return res.status(409).json({
        message:
          "This email is already registered for another FoodFleet workspace. Please sign in with the original role or use a different email.",
      });
    }

    user.name = name;
    user.image = picture;
    if (role && role !== "admin" && !user.role) {
      user.role = role;
    }
    await user.save();
  }

  const serializedUser = serializeUserForToken(user);

  const token = createAccessToken(serializedUser);
  setRefreshCookie(res, serializedUser._id);

  res.status(200).json({
    message: "Logged Success",
    token,
    user: serializedUser,
  });
});

export const addUserRole = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { role } = req.body as { role: Role };

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const existingUser = await User.findById(req.user._id);

  if (!existingUser) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  if (existingUser.role && existingUser.role !== role) {
    return res.status(409).json({
      message: "This email already has a FoodFleet role.",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const serializedUser = serializeUserForToken(user);

  const token = createAccessToken(serializedUser);
  setRefreshCookie(res, serializedUser._id);

  res.json({ user: serializedUser, token });
});

export const refreshAccessToken = TryCatch(async (req, res) => {
  const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token missing",
    });
  }

  let decoded: { userId?: string };

  try {
    decoded = jwt.verify(refreshToken, getRefreshSecret()) as {
      userId?: string;
    };
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({
      message: "User not found",
    });
  }

  const serializedUser = serializeUserForToken(user);
  const token = createAccessToken(serializedUser);
  setRefreshCookie(res, serializedUser._id);

  res.json({ user: serializedUser, token });
});

export const logoutUser = TryCatch(async (_req, res) => {
  clearRefreshCookie(res);
  res.json({ message: "Logged out successfully" });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json(serializeUserForToken(user));
});
