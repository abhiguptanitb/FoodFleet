import mongoose from "mongoose";
const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is missing in auth service environment");
    }
    await mongoose.connect(mongoUri, {
        dbName: process.env.DB_NAME || "FoodFleet",
        serverSelectionTimeoutMS: 10000,
    });
    console.log("Auth service connected to mongodb");
};
export default connectDB;
