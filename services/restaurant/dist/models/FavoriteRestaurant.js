import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
        index: true,
    },
}, { timestamps: true });
schema.index({ userId: 1, restaurantId: 1 }, { unique: true });
export default mongoose.model("FavoriteRestaurant", schema);
