import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/api-auth";
import { getEventCollection } from "@/lib/mongodb-collections";
import { serializeDocs } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ eventCode: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { eventCode } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  // Read users and their feedback from the event database
  const usersCol = await getEventCollection(eventCode, "users");
  const users = await usersCol.find().toArray();

  const feedbackCol = await getEventCollection(eventCode, "feedback");
  const feedbackDocs = await feedbackCol.find().sort({ timestamp: -1 }).toArray();

  // Build a user lookup map
  const userMap = new Map<string, Record<string, unknown>>();
  for (const user of users) {
    const u = user as Record<string, unknown>;
    userMap.set(String(u._id), u);
    if (u.email) userMap.set(String(u.email), u);
  }

  // Enrich feedback with user info
  const enriched = feedbackDocs.map((fb) => {
    const fbDoc = fb as Record<string, unknown>;
    const user = userMap.get(String(fbDoc.userId)) ?? {};
    const firstName = (user.firstName as string) || "";
    const lastName = (user.lastName as string) || "";
    return {
      ...fbDoc,
      userName: [firstName, lastName].filter(Boolean).join(" "),
      userEmail: (user.email as string) || "",
      userCompany: (user.company as string) || "",
    };
  });

  return NextResponse.json(serializeDocs(enriched as Record<string, unknown>[]));
}
