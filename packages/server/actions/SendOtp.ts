// actions/SendOtp.ts
import { db } from "../db";
import { EmailOtp } from "../models/EmailOtp";
import { Waitlist } from "../models/Waitlist";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY!);

// basic email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// OTP expiry → 10 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000;

// resend cooldown → 30 seconds
const OTP_COOLDOWN_MS = 30 * 1000;

export async function sendWaitlistOtp(email: string) {
  await db();

  const cleanEmail = email.toLowerCase().trim();

  // ❌ invalid email format
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { error: "Invalid email address" };
  }

  // ✅ already on waitlist → no OTP needed
  const alreadyOnWaitlist = await Waitlist.findOne({ email: cleanEmail });
  if (alreadyOnWaitlist) {
    return {
      alreadyJoined: true,
      referralCode: alreadyOnWaitlist.referralCode,
      points: alreadyOnWaitlist.points ?? 0,
    };
  }

  // ⏱ cooldown check
  const recentOtp = await EmailOtp.findOne({
    email: cleanEmail,
    createdAt: { $gt: new Date(Date.now() - OTP_COOLDOWN_MS) },
  });

  if (recentOtp) {
    return { error: "Please wait before requesting another OTP" };
  }

  // 🔢 generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 📧 load HTML template
  const templatePath = path.join(process.cwd(), "templates", "OTP.html");
  let htmlTemplate = fs.readFileSync(templatePath, "utf8");
  htmlTemplate = htmlTemplate.replace(/{{OTP}}/g, otp);

  // 🚨 SEND EMAIL FIRST (important)
  try {
    await resend.emails.send({
      from: process.env.OTP_EMAIL!,
      to: [cleanEmail],
      subject: `[${otp}] Verify your email`,
      html: htmlTemplate,
    });
  } catch (err) {
    console.error("OTP send failed:", err);
    return { error: "Failed to send OTP. Try a valid email." };
  }

  // 🧹 remove old OTPs
  await EmailOtp.deleteMany({ email: cleanEmail });

  // 💾 save OTP ONLY after successful send
  await EmailOtp.create({
    email: cleanEmail,
    otp,
    verified: false,
    createdAt: new Date(),
  });

  return { success: true };
}

export async function verifyWaitlistOtp(email: string, otp: string) {
  await db();

  const cleanEmail = email.toLowerCase().trim();

  // ❌ invalid format
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error("Invalid email address");
  }

  // 🔍 find OTP record
  const record = await EmailOtp.findOne({
    email: cleanEmail,
    otp,
    verified: false,
  });

  // ❌ not found
  if (!record) {
    throw new Error("Invalid or expired OTP");
  }

  // ⏳ expiry check (10 minutes)
  const isExpired =
    Date.now() - new Date(record.createdAt).getTime() > OTP_EXPIRY_MS;

  if (isExpired) {
    await EmailOtp.deleteMany({ email: cleanEmail });
    throw new Error("OTP expired. Please request a new one.");
  }

  // ✅ mark verified
  record.verified = true;
  await record.save();

  return { verified: true };
}
