import { NextResponse } from "next/server";
import { resolveTokenIdentity, findAdminUser } from "@/lib/api-auth";

/**
 * GET /api/check-permissions
 *
 * Verifies the caller's Cognito token and returns their role and permissions
 * from MongoDB. Returns { role: null, permissions: null } if the user is not
 * found or inactive (instead of 403), because this endpoint is used by the
 * client-side permissions context to determine the user's access level.
 */
export async function GET(request: Request) {
  const identity = await resolveTokenIdentity(request);
  if (identity instanceof NextResponse) return identity;

  try {
    const user = await findAdminUser(identity.sub, identity.email);

    if (!user || !user.isActive) {
      return NextResponse.json({ role: null, permissions: null });
    }

    return NextResponse.json({
      role: user.role,
      permissions: {
        userId: user.cognitoSub,
        cognitoSub: user.cognitoSub,
        email: user.email,
        role: user.role,
        clientIds: user.clientIds ?? null,
        eventCodes: user.eventCodes ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        createdBy: user.createdBy,
        updatedBy: user.updatedBy,
      },
    });
  } catch (err) {
    console.error("[check-permissions] Database operation failed:", err);
    return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
  }
}
