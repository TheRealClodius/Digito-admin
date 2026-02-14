import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { FeedbackEntry } from "@/types/feedback";

export async function GET(request: Request) {
  // Auth: verify token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing authorization" },
      { status: 401 }
    );
  }

  let claims;
  try {
    claims = await getAdminAuth().verifyIdToken(
      authHeader.replace("Bearer ", "")
    );
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Only superadmins can view feedback
  const isSuperAdmin = claims.superadmin === true || claims.admin === true;
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can view feedback" },
      { status: 403 }
    );
  }

  // Validate query params
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const eventId = searchParams.get("eventId");

  if (!clientId || !eventId) {
    return NextResponse.json(
      { error: "clientId and eventId are required" },
      { status: 400 }
    );
  }

  const db = getAdminDb();

  // 1. List all users in the event
  const usersPath = `clients/${clientId}/events/${eventId}/users`;
  const usersSnap = await db.collection(usersPath).get();

  if (usersSnap.empty) {
    return NextResponse.json([]);
  }

  // 2. For each user, fetch their feedback subcollection
  const feedbackEntries: FeedbackEntry[] = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const firstName = userData.firstName || "";
    const lastName = userData.lastName || "";
    const userName = [firstName, lastName].filter(Boolean).join(" ");

    const feedbackPath = `${usersPath}/${userDoc.id}/feedback`;
    const feedbackSnap = await db.collection(feedbackPath).get();

    if (feedbackSnap.empty) continue;

    for (const feedbackDoc of feedbackSnap.docs) {
      const fbData = feedbackDoc.data();
      feedbackEntries.push({
        id: feedbackDoc.id,
        feedbackText: fbData.feedbackText,
        timestamp: fbData.timestamp,
        chatSessionId: fbData.chatSessionId,
        userId: userDoc.id,
        userName,
        userEmail: userData.email || "",
        userCompany: userData.company || "",
      });
    }
  }

  // 3. Sort by timestamp descending
  feedbackEntries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json(feedbackEntries);
}
