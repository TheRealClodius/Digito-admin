import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createCognitoUser, enableCognitoUser, generateTemporaryPassword } from "@/lib/cognito-admin";
import { getAdminUsersCollection } from "@/lib/mongodb-collections";
import type { UserRole } from "@/types/permissions";

const ASSIGNABLE_ROLES: UserRole[] = ["clientAdmin", "eventAdmin"];

export async function POST(request: Request) {
  // 1. Verify caller
  const caller = await requireAuth(request);
  if (caller instanceof NextResponse) return caller;

  // 2. Parse and validate body
  const body = await request.json();
  const { email, role, clientIds, eventCodes, firstName, lastName } = body;

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
  if (!caller.isSuperAdmin && caller.role !== "clientAdmin") {
    return NextResponse.json(
      { error: "Only superadmins and clientAdmins can assign roles" },
      { status: 403 }
    );
  }

  // ClientAdmin restrictions
  if (caller.role === "clientAdmin") {
    if (role !== "eventAdmin") {
      return NextResponse.json(
        { error: "ClientAdmins can only assign the eventAdmin role" },
        { status: 403 }
      );
    }

    const callerClientIds: string[] = caller.adminUser.clientIds || [];
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

  // 4. Create Cognito user (will fail if user already exists in Cognito, which is fine)
  let cognitoSub: string | undefined;
  const normalizedEmail = email.toLowerCase();

  try {
    const tempPassword = generateTemporaryPassword();
    const result = await createCognitoUser({
      email: normalizedEmail,
      temporaryPassword: tempPassword,
      firstName,
      lastName,
    });
    cognitoSub = result.cognitoSub;
  } catch (error: unknown) {
    const errorName = (error as { name?: string }).name;
    if (errorName !== "UsernameExistsException") {
      console.error("Failed to create Cognito user:", error);
      return NextResponse.json(
        { error: "Failed to create user in authentication system" },
        { status: 500 }
      );
    }
    // User already exists in Cognito — re-enable in case they were previously disabled
    try {
      await enableCognitoUser(normalizedEmail);
    } catch (enableError) {
      console.error("Failed to enable Cognito user:", enableError);
    }
  }

  // 5. Upsert admin user in MongoDB
  const collection = await getAdminUsersCollection();
  const now = new Date();

  const updateDoc: Record<string, unknown> = {
    role,
    clientIds,
    eventCodes: eventCodes || null,
    isActive: true,
    updatedAt: now,
    updatedBy: caller.sub,
  };

  if (cognitoSub) {
    updateDoc.cognitoSub = cognitoSub;
  }
  if (firstName) updateDoc.firstName = firstName;
  if (lastName) updateDoc.lastName = lastName;

  const result = await collection.updateOne(
    { email: normalizedEmail },
    {
      $set: updateDoc,
      $setOnInsert: {
        email: normalizedEmail,
        language: "it",
        createdAt: now,
        createdBy: caller.sub,
      },
    },
    { upsert: true }
  );

  const userId = result.upsertedId?.toString() || normalizedEmail;

  return NextResponse.json({ success: true, userId });
}
