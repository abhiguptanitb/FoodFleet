import jwt from "jsonwebtoken";
const normalizeId = (value) => {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }
    if (value && typeof value === "object") {
        const candidate = value;
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
const normalizeJwtUser = (user) => ({
    ...user,
    _id: normalizeId(user?._id),
    restaurantId: normalizeId(user?.restaurantId),
});
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({
                message: "Please Login - Token missing",
            });
            return;
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SEC);
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                message: "Invalid token",
            });
            return;
        }
        req.user = normalizeJwtUser(decodedValue.user);
        next();
    }
    catch (error) {
        console.error("JWT verify failed:", error);
        res.status(401).json({
            message: "Please Login - Jwt error",
        });
    }
};
export const isSeller = async (req, res, next) => {
    const user = req.user;
    if (user && user.role !== "seller") {
        res.status(401).json({
            message: "You are not authorized seller",
        });
        return;
    }
    next();
};
