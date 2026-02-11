import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[check-permissions] Missing authorization header");
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  // Separate Admin SDK init from token verification so init failures
  // return 503 (not 401) — the client uses this to trigger fallback.
  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    console.error("[check-permissions] Firebase Admin SDK init failed:", err);
    return NextResponse.json(
      { error: "Firebase Admin SDK not configured" },
      { status: 503 }
    );
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(
      authHeader.replace("Bearer ", "")
    );
  } catch (err) {
    console.error("[check-permissions] Token verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const uid = decoded.uid;
  const email = decoded.email?.toLowerCase();
  console.log(`[check-permissions] uid=${uid} email=${email} claims=`, {
    superadmin: decoded.superadmin,
    admin: decoded.admin,
    role: decoded.role,
  });

  // 1. Check custom claims
  if (decoded.superadmin === true || decoded.admin === true) {
    console.log("[check-permissions] → superadmin (from claims)");
    return NextResponse.json({ role: "superadmin", permissions: null });
  }

  const claimRole = decoded.role as string | undefined;
  if (claimRole === "clientAdmin" || claimRole === "eventAdmin") {
    try {
      const permDoc = await getAdminDb()
        .collection("userPermissions")
        .doc(uid)
        .get();
      console.log(`[check-permissions] → ${claimRole} (from claims), firestore doc exists=${permDoc.exists}`);
      return NextResponse.json({
        role: claimRole,
        permissions: permDoc.exists ? permDoc.data() : null,
      });
    } catch (err) {
      console.error("[check-permissions] Firestore read failed for claim-based role:", err);
      return NextResponse.json({ error: "Firestore read failed" }, { status: 500 });
    }
  }

  // 2. No claims — check Firestore by UID
  try {
    console.log("[check-permissions] No role claims found, checking Firestore by UID...");
    const permDoc = await getAdminDb()
      .collection("userPermissions")
      .doc(uid)
      .get();

    if (permDoc.exists) {
      const data = permDoc.data()!;
      console.log(`[check-permissions] → ${data.role} (from Firestore UID lookup, auto-healing claims)`);
      await getAdminAuth().setCustomUserClaims(uid, { role: data.role });
      return NextResponse.json({ role: data.role, permissions: data });
    }

    // 3. No doc by UID — check by email (handles UID mismatch between providers)
    console.log(`[check-permissions] No doc at userPermissions/${uid}, checking by email=${email}...`);
    if (email) {
      const emailQuery = await getAdminDb()
        .collection("userPermissions")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        const oldDoc = emailQuery.docs[0];
        const data = oldDoc.data();
        console.log(`[check-permissions] → ${data.role} (from email query, old doc id=${oldDoc.id}, migrating to uid=${uid})`);

        // Migrate doc to correct UID
        await getAdminDb()
          .collection("userPermissions")
          .doc(uid)
          .set({
            ...data,
            userId: uid,
            updatedAt: FieldValue.serverTimestamp(),
          });

        if (oldDoc.id !== uid) {
          await oldDoc.ref.delete();
        }

        await getAdminAuth().setCustomUserClaims(uid, { role: data.role });
        return NextResponse.json({ role: data.role, permissions: data });
      }
    }
  } catch (err) {
    console.error("[check-permissions] Firestore operation failed:", err);
    return NextResponse.json({ error: "Firestore operation failed" }, { status: 500 });
  }

  // 4. No permissions found
  console.log("[check-permissions] → null (no permissions found anywhere)");
  return NextResponse.json({ role: null, permissions: null });
}
