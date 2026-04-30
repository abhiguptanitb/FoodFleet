import mongoose from "mongoose";
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: "FoodFleet",
        });
        console.log("connected to mongodb");
    }
    catch (error) {
        console.log(error);
    }
};
export default connectDB;
