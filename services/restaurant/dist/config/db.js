import mongoose from "mongoose";
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME || "FoodFleet",
        });
    }
    catch (error) {
        console.error(error);
    }
};
export default connectDB;
