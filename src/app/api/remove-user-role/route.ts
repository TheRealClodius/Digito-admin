import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { disableCognitoUser } from "@/lib/cognito-admin";
import { getAdminUsersCollection } from "@/lib/mongodb-collections";
import { ObjectId } from "mongodb";

export async function DELETE(request: Request) {
  // 1. Verify caller
  const caller = await requireAuth(request);
  if (caller instanceof NextResponse) return caller;

  // 2. Parse and validate body
  const body = await request.json();
  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // 3. Find target user in MongoDB (by ObjectId or cognitoSub)
  const collection = await getAdminUsersCollection();
  let targetUser;

  if (ObjectId.isValid(userId)) {
    targetUser = await collection.findOne({ _id: new ObjectId(userId) });
  }
  if (!targetUser) {
    targetUser = await collection.findOne({ cognitoSub: userId });
  }
  if (!targetUser) {
    targetUser = await collection.findOne({ email: userId.toLowerCase() });
  }

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Cannot remove superadmin via API
  if (targetUser.role === "superadmin") {
    return NextResponse.json(
      { error: "Cannot remove superadmin role via API" },
      { status: 403 }
    );
  }

  // 4. Authorize caller
  if (!caller.isSuperAdmin && caller.role !== "clientAdmin") {
    return NextResponse.json(
      { error: "Only superadmins and clientAdmins can remove roles" },
      { status: 403 }
    );
  }

  // ClientAdmin restrictions
  if (caller.role === "clientAdmin") {
    if (targetUser.role !== "eventAdmin") {
      return NextResponse.json(
        { error: "ClientAdmins can only remove eventAdmin roles" },
        { status: 403 }
      );
    }

    const callerClientIds: string[] = caller.adminUser.clientIds || [];
    const targetClientIds: string[] = targetUser.clientIds || [];

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

  // 5. Deactivate in MongoDB
  await collection.updateOne(
    { _id: targetUser._id },
    {
      $set: {
        isActive: false,
        updatedAt: new Date(),
        updatedBy: caller.sub,
      },
    }
  );

  // 6. Disable in Cognito (prevent login)
  try {
    await disableCognitoUser(targetUser.email);
  } catch (error) {
    console.error("Failed to disable Cognito user:", error);
    // Non-blocking: MongoDB is already updated
  }

  return NextResponse.json({ success: true });
}
