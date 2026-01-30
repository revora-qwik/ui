import mongoose from "mongoose";

const WaitlistSchema = new mongoose.Schema({
  name: String,
  email: {
  type: String,
  required: true,
  unique: true,
  index: true,
},

  referralCode: { type: String, unique: true },
  referredBy: String,
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Waitlist =
  mongoose.models.Waitlist ??
  mongoose.model("Waitlist", WaitlistSchema);
