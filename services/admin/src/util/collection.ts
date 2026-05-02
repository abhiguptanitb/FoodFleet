import { connectDb } from "../config/db.js";

export const getRestaurantCollection = async () => {
  const db = await connectDb();

  return db.collection("restaurants");
};

export const getRiderCollection = async () => {
  const db = await connectDb();

  return db.collection("riders");
};

export const getUserCollection = async () => {
  const db = await connectDb();

  return db.collection("users");
};

export const getOrderCollection = async () => {
  const db = await connectDb();

  return db.collection("orders");
};

export const getCartCollection = async () => {
  const db = await connectDb();

  return db.collection("carts");
};

export const getAddressCollection = async () => {
  const db = await connectDb();

  return db.collection("addresses");
};
