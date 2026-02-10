import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyEventUserAccess } from "../auth-helper";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  const body = await request.json();
  const { clientId, eventId, userId, whitelistData } = body;

  if (!clientId || !eventId || !userId || !whitelistData) {
    return NextResponse.json(
      { error: "clientId, eventId, userId, and whitelistData are required" },
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

  // Set isActive to true
  await userDocRef.update({ isActive: true });

  // Re-add whitelist entry
  const whitelistPath = `clients/${clientId}/events/${eventId}/whitelist`;
  await db.collection(whitelistPath).doc(userId).set({
    email: whitelistData.email,
    accessTier: whitelistData.accessTier || "standard",
    company: whitelistData.company || null,
    lockedFields: whitelistData.lockedFields || null,
    addedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
