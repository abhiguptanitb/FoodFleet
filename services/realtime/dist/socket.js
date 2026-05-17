import { Server } from "socket.io";
import jwt from "jsonwebtoken";
let io;
export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error("Unauthorized"));
            }
            const decoded = jwt.verify(token, process.env.JWT_SEC);
            if (!decoded || !decoded.user) {
                return next(new Error("Unauthorized"));
            }
            socket.data.user = decoded.user;
            next();
        }
        catch {
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        const user = socket.data.user;
        if (!user) {
            socket.disconnect();
            return;
        }
        const userId = user._id;
        socket.join(`user:${userId}`);
        if (user.restaurantId) {
            socket.join(`restaurant:${user.restaurantId}`);
        }
        socket.on("restaurant:join", (restaurantId) => {
            if (typeof restaurantId !== "string" || !restaurantId.trim())
                return;
            socket.join(`restaurant:${restaurantId.trim()}`);
        });
    });
    return io;
};
export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};
