// actions/SendOtp.ts
import { db } from "../db";
import { EmailOtp } from "../models/EmailOtp";
import { Waitlist } from "../models/Waitlist";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendWaitlistOtp(email: string) {
  await db();

  const cleanEmail = email.toLowerCase().trim();

  
  const alreadyOnWaitlist = await Waitlist.findOne({ email: cleanEmail });
  if (alreadyOnWaitlist) {
    return {
      alreadyJoined: true,
      referralCode: alreadyOnWaitlist.referralCode,
      points: alreadyOnWaitlist.points ?? 0,
    };
  }


  // ⏱ rate limit
  const recentOtp = await EmailOtp.findOne({
    email: cleanEmail,
    createdAt: { $gt: new Date(Date.now() - 30_000) },
  });

  if (recentOtp) {
    return { error: "Please wait before requesting another OTP" };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await EmailOtp.deleteMany({ email: cleanEmail });
  await EmailOtp.create({ email: cleanEmail, otp });

  const templatePath = path.join(process.cwd(), "templates", "OTP.html");
  let htmlTemplate = fs.readFileSync(templatePath, "utf8");
  htmlTemplate = htmlTemplate.replace(/{{OTP}}/g, otp);

  await resend.emails.send({
    from: process.env.OTP_EMAIL!,
    to: [cleanEmail],
    subject: `[${otp}] Verify your email`,
    html: htmlTemplate,
  });

  return { success: true };
}


export async function verifyWaitlistOtp(email: string, otp: string) {
  await db();

  const cleanEmail = email.toLowerCase().trim();

  const record = await EmailOtp.findOne({
    email: cleanEmail,
    otp,
    verified: false,
  });

  if (!record) {
    throw new Error("Invalid or expired OTP");
  }

  record.verified = true;
  await record.save();

  return { verified: true };
}
