import { db } from "../db";
import { Waitlist } from "../models/Waitlist";

export async function getLeaderboard() {
  await db();

  return Waitlist.find({})
    .sort({ points: -1 })
    .limit(50)
    .select("name points")
    .lean();
}
