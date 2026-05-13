import mongoose, { Schema, Document } from "mongoose";

export interface IRider extends Document {
  userId: string;
  riderName: string;
  picture: string;
  phoneNumber: string;
  aadharNumber: string;
  drivingLicenseNumber: string;
  isVerified: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationNotes?: string;
  rejectReason?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  isAvailble: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IRider>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    riderName: {
      type: String,
      required: true,
      trim: true,
    },
    picture: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    aadharNumber: {
      type: String,
      required: true,
    },
    drivingLicenseNumber: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verificationNotes: String,
    rejectReason: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    isAvailble: {
      type: Boolean,
      default: false,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ location: "2dsphere" });

export const Rider = mongoose.model<IRider>("Rider", schema);
