import mongoose from "mongoose";

const MONGO_URL = process.env.MONGO_URL!;

export async function db() {
  if (mongoose.connection.readyState >= 1) return;
   console.log("Connecting to Mongo...");
  await mongoose.connect(MONGO_URL);
}
