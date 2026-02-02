// models/EmailOtp.ts
import mongoose from "mongoose";

const EmailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  purpose: { type: String, default: "waitlist" },

  verified: { type: Boolean, default: false },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, 
  },
});

export const EmailOtp =
  mongoose.models.EmailOtp || mongoose.model("EmailOtp", EmailOtpSchema);
