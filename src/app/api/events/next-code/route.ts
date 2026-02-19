import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getClientEventsCollection } from "@/lib/mongodb-collections";

/**
 * GET /api/events/next-code
 *
 * Returns the next available eventCode for the current year.
 * Format: yyyyXXX where yyyy is the current year and XXX is a zero-padded
 * sequential number starting from 001.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const year = new Date().getFullYear();
  const yearPrefix = String(year);

  const collection = await getClientEventsCollection();

  // Find the highest eventCode starting with the current year prefix
  const results = await collection
    .find({ eventCode: { $regex: `^${yearPrefix}` } })
    .sort({ eventCode: -1 })
    .limit(1)
    .toArray();

  let nextNumber = 1;
  if (results.length > 0) {
    const lastCode = results[0].eventCode;
    const suffix = lastCode.slice(yearPrefix.length);
    const parsed = parseInt(suffix, 10);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  const nextEventCode = `${yearPrefix}${String(nextNumber).padStart(3, "0")}`;

  return NextResponse.json({ nextEventCode });
}
