import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/api-auth";
import { getEventCollection } from "@/lib/mongodb-collections";

type RouteContext = { params: Promise<{ eventCode: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { eventCode } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const [brands, sessions, happenings, whitelist, users, posts] = await Promise.all([
    getEventCollection(eventCode, "brands").then((c) => c.countDocuments()),
    getEventCollection(eventCode, "sessions").then((c) => c.countDocuments()),
    getEventCollection(eventCode, "happenings").then((c) => c.countDocuments()),
    getEventCollection(eventCode, "whitelist").then((c) => c.countDocuments()),
    getEventCollection(eventCode, "users").then((c) => c.countDocuments()),
    getEventCollection(eventCode, "posts").then((c) => c.countDocuments()),
  ]);

  return NextResponse.json({
    brands,
    sessions,
    happenings,
    whitelist,
    users,
    posts,
  });
}
