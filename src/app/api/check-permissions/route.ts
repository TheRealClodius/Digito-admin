import { NextResponse } from "next/server";
import { AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { verifyCognitoToken } from "@/lib/cognito";
import { getCognitoAdminClient, getUserPoolId } from "@/lib/cognito-admin";
import { getAdminUsersCollection } from "@/lib/mongodb-collections";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[check-permissions] Missing authorization header");
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyCognitoToken(authHeader.replace("Bearer ", ""));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[check-permissions] Token verification failed:", errMsg);
    return NextResponse.json({ error: "Invalid token", detail: errMsg }, { status: 401 });
  }

  const sub = payload.sub;
  let email: string | undefined;

  if (typeof payload.username === "string" && payload.username.includes("@")) {
    email = payload.username.toLowerCase();
  } else if (typeof payload.username === "string" && payload.username) {
    // Username is a UUID or federated identity (e.g. Google-linked user) — fetch email from Cognito
    try {
      const client = getCognitoAdminClient();
      const userData = await client.send(
        new AdminGetUserCommand({
          UserPoolId: getUserPoolId(),
          Username: payload.username,
        })
      );
      const emailAttr = userData.UserAttributes?.find((a) => a.Name === "email");
      if (emailAttr?.Value) {
        email = emailAttr.Value.toLowerCase();
      }
    } catch {
      // Could not fetch email from Cognito — proceed without email fallback
    }
  }

  console.log(`[check-permissions] sub=${sub} email=${email}`);

  try {
    const collection = await getAdminUsersCollection();

    // 1. Look up by Cognito sub (primary)
    let user = await collection.findOne({ cognitoSub: sub });

    // 2. Fall back to email lookup (handles sub changes, e.g. after Google federation)
    if (!user && email) {
      user = await collection.findOne({ email });
      if (user) {
        console.log(`[check-permissions] Found user by email fallback (old sub=${user.cognitoSub}, new sub=${sub})`);
      }
    }

    if (!user) {
      console.log("[check-permissions] → null (no user found)");
      return NextResponse.json({ role: null, permissions: null });
    }

    if (!user.isActive) {
      console.log(`[check-permissions] → null (user is inactive, email=${user.email})`);
      return NextResponse.json({ role: null, permissions: null });
    }

    console.log(`[check-permissions] → ${user.role} (email=${user.email})`);
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
    console.error("[check-permissions] MongoDB operation failed:", err);
    return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
  }
}
