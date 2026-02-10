import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyEventUserAccess } from "../auth-helper";

export async function POST(request: Request) {
  const body = await request.json();
  const { clientId, eventId, userId } = body;

  if (!clientId || !eventId || !userId) {
    return NextResponse.json(
      { error: "clientId, eventId, and userId are required" },
      { status: 400 }
    );
  }

  // Verify authorization
  const authResult = await verifyEventUserAccess(request, clientId, eventId);
  if (authResult instanceof NextResponse) return authResult;

  const db = getAdminDb();

  // Get user doc
  const userDocPath = `clients/${clientId}/events/${eventId}/users`;
  const userDocRef = db.collection(userDocPath).doc(userId);
  const userSnap = await userDocRef.get();

  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userData = userSnap.data()!;

  // Set isActive to false
  await userDocRef.update({ isActive: false });

  // Remove whitelist entry (query by email)
  const whitelistPath = `clients/${clientId}/events/${eventId}/whitelist`;
  const whitelistQuery = await db
    .collection(whitelistPath)
    .where("email", "==", userData.email)
    .get();

  for (const doc of whitelistQuery.docs) {
    await doc.ref.delete();
  }

  return NextResponse.json({ success: true });
}
