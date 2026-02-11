import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { UserRole } from "@/types/permissions";

const ASSIGNABLE_ROLES: UserRole[] = ["clientAdmin", "eventAdmin"];

export async function POST(request: Request) {
  // 1. Verify caller's token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  let callerClaims;
  try {
    callerClaims = await getAdminAuth().verifyIdToken(
      authHeader.replace("Bearer ", "")
    );
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Parse and validate body
  const body = await request.json();
  const { email, role, clientIds, eventIds } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json(
      { error: "clientIds is required and must be a non-empty array" },
      { status: 400 }
    );
  }

  // 3. Authorize caller
  const isSuperAdmin =
    callerClaims.superadmin === true || callerClaims.admin === true;
  const isCallerClientAdmin = callerClaims.role === "clientAdmin";

  if (!isSuperAdmin && !isCallerClientAdmin) {
    return NextResponse.json(
      { error: "Only superadmins and clientAdmins can assign roles" },
      { status: 403 }
    );
  }

  // ClientAdmin restrictions
  if (isCallerClientAdmin) {
    // ClientAdmins can only create eventAdmins
    if (role !== "eventAdmin") {
      return NextResponse.json(
        { error: "ClientAdmins can only assign the eventAdmin role" },
        { status: 403 }
      );
    }

    // ClientAdmin must have access to all requested clientIds
    const callerPermsSnap = await getAdminDb()
      .collection("userPermissions")
      .doc(callerClaims.uid)
      .get();
    const callerPerms = callerPermsSnap.data();
    const callerClientIds: string[] = callerPerms?.clientIds || [];

    const hasAccess = clientIds.every((id: string) =>
      callerClientIds.includes(id)
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You can only assign roles for your assigned clients" },
        { status: 403 }
      );
    }
  }

  // 4. Look up or create target user
  let targetUser;
  try {
    targetUser = await getAdminAuth().getUserByEmail(email);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found") {
      // Pre-create the user so claims and permissions are ready
      // when they first sign in (Google will auto-link to this account)
      targetUser = await getAdminAuth().createUser({ email });
    } else {
      throw error;
    }
  }

  // 5. Set custom claims
  await getAdminAuth().setCustomUserClaims(targetUser.uid, { role });

  // 6. Create userPermissions document
  await getAdminDb()
    .collection("userPermissions")
    .doc(targetUser.uid)
    .set({
      userId: targetUser.uid,
      email: targetUser.email,
      role,
      clientIds,
      eventIds: eventIds || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: callerClaims.uid,
      updatedBy: callerClaims.uid,
    });

  return NextResponse.json({ success: true, userId: targetUser.uid });
}
