import mongoose, { Document, Schema } from "mongoose";

export interface IFavoriteRestaurant extends Document {
  userId: string;
  restaurantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IFavoriteRestaurant>(
  {
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
  },
  { timestamps: true }
);

schema.index({ userId: 1, restaurantId: 1 }, { unique: true });

export default mongoose.model<IFavoriteRestaurant>(
  "FavoriteRestaurant",
  schema
);
