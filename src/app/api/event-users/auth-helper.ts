import { NextResponse } from "next/server";
import { requireAuth, type VerifiedCaller } from "@/lib/api-auth";

export interface CallerContext {
  caller: VerifiedCaller;
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
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  // Superadmins have full access
  if (result.isSuperAdmin) {
    return { caller: result, isSuperAdmin: true };
  }

  const isClientAdmin = result.role === "clientAdmin";
  const isEventAdmin = result.role === "eventAdmin";

  if (!isClientAdmin && !isEventAdmin) {
    return NextResponse.json(
      { error: "Only admins can manage event users" },
      { status: 403 }
    );
  }

  // Check caller's scope from MongoDB adminUser
  const callerClientIds: string[] = result.adminUser.clientIds || [];
  const callerEventCodes: string[] = result.adminUser.eventCodes || [];

  if (!callerClientIds.includes(clientId)) {
    return NextResponse.json(
      { error: "You do not have access to this client" },
      { status: 403 }
    );
  }

  if (isEventAdmin && !callerEventCodes.includes(eventId)) {
    return NextResponse.json(
      { error: "You do not have access to this event" },
      { status: 403 }
    );
  }

  return { caller: result, isSuperAdmin: false };
}
