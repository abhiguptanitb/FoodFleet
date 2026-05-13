import "dotenv/config";
import mongoose, { Types } from "mongoose";
const DB_NAME = process.env.DB_NAME || "FoodFleet";
const isImageUrl = (value) => typeof value === "string" &&
    /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(value);
const getUserQuery = (userId) => {
    if (!userId?.trim())
        return null;
    if (Types.ObjectId.isValid(userId)) {
        return { _id: new Types.ObjectId(userId) };
    }
    return null;
};
const orderRiderDocument = (rider, riderName) => {
    const ordered = {
        _id: rider._id,
        userId: rider.userId,
        riderName,
        picture: rider.picture,
        phoneNumber: rider.phoneNumber,
        aadharNumber: rider.aadharNumber,
        drivingLicenseNumber: rider.drivingLicenseNumber,
        isVerified: rider.isVerified,
        verificationStatus: rider.verificationStatus,
        verificationNotes: rider.verificationNotes,
        rejectReason: rider.rejectReason,
        location: rider.location,
        isAvailble: rider.isAvailble,
        lastActiveAt: rider.lastActiveAt,
        createdAt: rider.createdAt,
        updatedAt: new Date(),
        __v: rider.__v,
    };
    for (const [key, value] of Object.entries(rider)) {
        if (!(key in ordered)) {
            ordered[key] = value;
        }
    }
    for (const key of Object.keys(ordered)) {
        if (typeof ordered[key] === "undefined") {
            delete ordered[key];
        }
    }
    return ordered;
};
const orderOrderDocument = (order) => {
    const ordered = {
        _id: order._id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        riderId: order.riderId,
        riderName: order.riderName,
        riderImage: order.riderImage,
        riderPhone: order.riderPhone,
        riderAmount: order.riderAmount,
        distance: order.distance,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        platfromFee: order.platfromFee,
        totalAmount: order.totalAmount,
        addressId: order.addressId,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        __v: order.__v,
    };
    for (const [key, value] of Object.entries(order)) {
        if (!(key in ordered)) {
            ordered[key] = value;
        }
    }
    for (const key of Object.keys(ordered)) {
        if (typeof ordered[key] === "undefined") {
            delete ordered[key];
        }
    }
    return ordered;
};
const run = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is required to backfill rider names");
    }
    await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME });
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error("Mongo connection is not ready");
    }
    const riders = db.collection("riders");
    const users = db.collection("users");
    const orders = db.collection("orders");
    const riderCursor = riders.find({});
    let scanned = 0;
    let ridersUpdated = 0;
    let ordersUpdated = 0;
    let ordersReordered = 0;
    let skipped = 0;
    for await (const rider of riderCursor) {
        scanned += 1;
        const userQuery = getUserQuery(rider.userId);
        const user = userQuery ? await users.findOne(userQuery) : null;
        const riderName = user?.name?.trim() || rider.riderName?.trim();
        if (!riderName) {
            skipped += 1;
            console.log(`Skipped rider ${rider._id}: matching user name not found`);
            continue;
        }
        const riderImage = isImageUrl(rider.riderName)
            ? rider.riderName
            : rider.picture || null;
        const orderedRider = orderRiderDocument(rider, riderName);
        const riderResult = await riders.replaceOne({ _id: rider._id }, orderedRider);
        const orderFilter = isImageUrl(rider.riderName) || !rider.riderName?.trim()
            ? {
                riderId: rider._id.toString(),
                $or: [
                    { riderName: { $exists: false } },
                    { riderName: null },
                    { riderName: "" },
                    { riderName: /^https?:\/\// },
                    { riderImage: { $exists: false } },
                    { riderImage: null },
                    { riderImage: "" },
                ],
            }
            : {
                riderId: rider._id.toString(),
                $or: [
                    { riderImage: { $exists: false } },
                    { riderImage: null },
                    { riderImage: "" },
                ],
            };
        const orderResult = await orders.updateMany(orderFilter, {
            $set: {
                riderName,
                riderImage: riderImage ?? null,
                updatedAt: new Date(),
            },
        });
        ridersUpdated += riderResult.modifiedCount;
        ordersUpdated += orderResult.modifiedCount;
    }
    const orderCursor = orders.find({});
    for await (const order of orderCursor) {
        const orderedOrder = orderOrderDocument(order);
        const result = await orders.replaceOne({ _id: order._id }, orderedOrder);
        ordersReordered += result.modifiedCount;
    }
    console.log(`Backfill complete. Scanned ${scanned} riders, updated ${ridersUpdated} riders, updated ${ordersUpdated} order rider fields, reordered ${ordersReordered} orders, skipped ${skipped}.`);
    await mongoose.disconnect();
};
run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
