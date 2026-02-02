import { db } from "../db";
import { Waitlist } from "../models/Waitlist";
import { makeReferralCode } from "../utils/referralCode";
import { EmailOtp } from "../models/EmailOtp";

export async function joinWaitlist({
  name,
  email,
  referralCode,
}: {
  name: string;
  email: string;
  referralCode?: string;
}) {
  await db();

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();

  if (!cleanEmail || !cleanName) {
    throw new Error("Invalid input");
  }

 
  const verifiedOtp = await EmailOtp.findOne({
    email: cleanEmail,
    verified: true,
  });

  if (!verifiedOtp) {
    throw new Error("Email not verified");
  }

  const existing = await Waitlist.findOne({ email: cleanEmail });
  if (existing) {
    return {
      referralCode: existing.referralCode,
      points: existing.points,
    };
  }

  const myCode = makeReferralCode(cleanName, cleanEmail);

  await Waitlist.create({
    name: cleanName,
    email: cleanEmail,
    referralCode: myCode,
    referredBy: referralCode ?? null,
  });

  if (referralCode) {
    const referrer = await Waitlist.findOne({
      referralCode,
      email: { $ne: cleanEmail },
    });

    if (referrer) {
      await Waitlist.updateOne(
        { _id: referrer._id },
        { $inc: { points: 10 } }
      );
    }
  }

  
  await EmailOtp.deleteMany({ email: cleanEmail });

  return {
    referralCode: myCode,
    points: 0,
  };
}
