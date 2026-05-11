import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoute from "./routes/auth.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoute);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Auth service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Auth service failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

startServer();
