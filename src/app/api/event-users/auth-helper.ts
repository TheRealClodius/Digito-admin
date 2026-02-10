import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface CallerContext {
  claims: DecodedIdToken;
  isSuperAdmin: boolean;
}

/**
 * Verify the caller's token and check authorization for event user management.
 * Returns the caller context or an error Response.
 */
export async function verifyEventUserAccess(
  request: Request,
  clientId: string,
  eventId: string
): Promise<CallerContext | NextResponse> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing authorization" },
      { status: 401 }
    );
  }

  let claims: DecodedIdToken;
  try {
    claims = await getAdminAuth().verifyIdToken(
      authHeader.replace("Bearer ", "")
    );
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const isSuperAdmin =
    claims.superadmin === true || claims.admin === true;

  if (isSuperAdmin) {
    return { claims, isSuperAdmin: true };
  }

  const isClientAdmin = claims.role === "clientAdmin";
  const isEventAdmin = claims.role === "eventAdmin";

  if (!isClientAdmin && !isEventAdmin) {
    return NextResponse.json(
      { error: "Only admins can manage event users" },
      { status: 403 }
    );
  }

  // Check caller's scope
  const callerPermsSnap = await getAdminDb()
    .collection("userPermissions")
    .doc(claims.uid)
    .get();
  const callerPerms = callerPermsSnap.data();
  const callerClientIds: string[] = callerPerms?.clientIds || [];
  const callerEventIds: string[] = callerPerms?.eventIds || [];

  if (!callerClientIds.includes(clientId)) {
    return NextResponse.json(
      { error: "You do not have access to this client" },
      { status: 403 }
    );
  }

  if (isEventAdmin && !callerEventIds.includes(eventId)) {
    return NextResponse.json(
      { error: "You do not have access to this event" },
      { status: 403 }
    );
  }

  return { claims, isSuperAdmin: false };
}
