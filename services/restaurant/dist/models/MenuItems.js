import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        trim: true,
        default: "Popular",
        index: true,
    },
    variants: [
        {
            name: { type: String, trim: true },
            priceDelta: { type: Number, default: 0 },
        },
    ],
    addOns: [
        {
            name: { type: String, trim: true },
            price: { type: Number, default: 0 },
        },
    ],
    image: {
        type: String,
        required: true,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
export default mongoose.model("MenuItem", schema);
