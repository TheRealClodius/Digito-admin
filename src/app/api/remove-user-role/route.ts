import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function DELETE(request: Request) {
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
  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // 3. Get target user's permissions
  const targetPermsSnap = await getAdminDb()
    .collection("userPermissions")
    .doc(userId)
    .get();

  if (!targetPermsSnap.exists) {
    return NextResponse.json(
      { error: "User permissions not found" },
      { status: 404 }
    );
  }

  const targetPerms = targetPermsSnap.data()!;

  // Cannot remove superadmin via API
  if (targetPerms.role === "superadmin") {
    return NextResponse.json(
      { error: "Cannot remove superadmin role via API" },
      { status: 403 }
    );
  }

  // 4. Authorize caller
  const isSuperAdmin =
    callerClaims.superadmin === true || callerClaims.admin === true;
  const isCallerClientAdmin = callerClaims.role === "clientAdmin";

  if (!isSuperAdmin && !isCallerClientAdmin) {
    return NextResponse.json(
      { error: "Only superadmins and clientAdmins can remove roles" },
      { status: 403 }
    );
  }

  // ClientAdmin restrictions
  if (isCallerClientAdmin) {
    // ClientAdmins can only remove eventAdmins
    if (targetPerms.role !== "eventAdmin") {
      return NextResponse.json(
        { error: "ClientAdmins can only remove eventAdmin roles" },
        { status: 403 }
      );
    }

    // ClientAdmin must have access to target's clients
    const callerPermsSnap = await getAdminDb()
      .collection("userPermissions")
      .doc(callerClaims.uid)
      .get();
    const callerPerms = callerPermsSnap.data();
    const callerClientIds: string[] = callerPerms?.clientIds || [];
    const targetClientIds: string[] = targetPerms.clientIds || [];

    const hasAccess = targetClientIds.every((id: string) =>
      callerClientIds.includes(id)
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You can only remove roles for admins within your clients" },
        { status: 403 }
      );
    }
  }

  // 5. Remove custom claims
  await getAdminAuth().setCustomUserClaims(userId, { role: null });

  // 6. Delete userPermissions document
  await getAdminDb().collection("userPermissions").doc(userId).delete();

  return NextResponse.json({ success: true });
}
