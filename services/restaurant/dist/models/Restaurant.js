import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: String,
    image: {
        type: String,
        required: true,
    },
    ownerId: {
        type: String,
        required: true,
    },
    phone: {
        type: Number,
        required: true,
    },
    isVerified: {
        type: Boolean,
        required: true,
    },
    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
        index: true,
    },
    verificationNotes: String,
    rejectReason: String,
    cuisine: {
        type: String,
        trim: true,
        default: "Mixed",
        index: true,
    },
    rating: {
        type: Number,
        default: 4.1,
        min: 0,
        max: 5,
    },
    deliveryTimeMinutes: Number,
    priceRange: {
        type: String,
        enum: ["budget", "mid", "premium"],
        default: "mid",
        index: true,
    },
    autoLocation: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        },
        formattedAddress: {
            type: String,
        },
    },
    isOpen: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
schema.index({ autoLocation: "2dsphere" });
export default mongoose.model("Restaurant", schema);
