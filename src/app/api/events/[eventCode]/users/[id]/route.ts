import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/api-auth";
import { getEventCollection } from "@/lib/mongodb-collections";
import { serializeDoc, parseObjectId, apiError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ eventCode: string; id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { eventCode, id } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const oid = parseObjectId(id);
  if (!oid) return apiError("Invalid ID", 400);

  const col = await getEventCollection(eventCode, "users");
  const doc = await col.findOne({ _id: oid });
  if (!doc) return apiError("User not found", 404);

  return NextResponse.json(serializeDoc(doc as Record<string, unknown>));
}

export async function PUT(request: Request, context: RouteContext) {
  const { eventCode, id } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const oid = parseObjectId(id);
  if (!oid) return apiError("Invalid ID", 400);

  const body = await request.json();
  const usersCol = await getEventCollection(eventCode, "users");
  const whitelistCol = await getEventCollection(eventCode, "whitelist");

  const user = await usersCol.findOne({ _id: oid });
  if (!user) return apiError("User not found", 404);

  const userDoc = user as Record<string, unknown>;

  // Handle activation/deactivation with whitelist sync
  if ("isActive" in body) {
    await usersCol.updateOne({ _id: oid }, { $set: { isActive: body.isActive } });

    if (body.isActive === false) {
      // Deactivate: remove whitelist entry
      if (userDoc.email) {
        await whitelistCol.deleteOne({ email: userDoc.email }).catch(() => {});
      }
    } else if (body.isActive === true && body.whitelistData) {
      // Reactivate: restore whitelist entry
      await whitelistCol.insertOne({
        ...body.whitelistData,
        addedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).catch(() => {});
    }
  }

  const updated = await usersCol.findOne({ _id: oid });
  return NextResponse.json(serializeDoc(updated as Record<string, unknown>));
}

export async function DELETE(request: Request, context: RouteContext) {
  const { eventCode, id } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const oid = parseObjectId(id);
  if (!oid) return apiError("Invalid ID", 400);

  const usersCol = await getEventCollection(eventCode, "users");
  const user = await usersCol.findOne({ _id: oid });
  if (!user) return apiError("User not found", 404);

  const userDoc = user as Record<string, unknown>;

  // Remove whitelist entry
  if (userDoc.email) {
    const whitelistCol = await getEventCollection(eventCode, "whitelist");
    await whitelistCol.deleteOne({ email: userDoc.email }).catch(() => {});
  }

  await usersCol.deleteOne({ _id: oid });
  return NextResponse.json({ success: true });
}
