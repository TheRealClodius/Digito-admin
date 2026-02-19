import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  getClientEventsCollection,
  getEventCollection,
  EVENT_COLLECTIONS,
} from "@/lib/mongodb-collections";
import { serializeDoc, parseObjectId, apiError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ clientId: string; eventCode: string }> };

const ALLOWED_FIELDS = [
  "name", "description", "venue", "startDate", "endDate",
  "logoUrl", "bannerUrl", "websiteUrl", "instagramUrl",
  "chatPrompt", "imageUrls", "isActive",
];

const DATE_FIELDS = ["startDate", "endDate"];

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { clientId, eventCode } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const collection = await getClientEventsCollection();
  const doc = await collection.findOne({ clientId: oid, eventCode });
  if (!doc) return apiError("Event not found", 404);

  return NextResponse.json(serializeDoc(doc));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { clientId, eventCode } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const body = await request.json();

  // Only allow known fields
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      update[field] = DATE_FIELDS.includes(field) && typeof body[field] === "string"
        ? new Date(body[field])
        : body[field];
    }
  }
  update.updatedAt = new Date();

  const collection = await getClientEventsCollection();
  const result = await collection.updateOne(
    { clientId: oid, eventCode },
    { $set: update }
  );
  if (result.matchedCount === 0) return apiError("Event not found", 404);

  const updated = await collection.findOne({ clientId: oid, eventCode });
  return NextResponse.json(serializeDoc(updated!));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { clientId, eventCode } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const collection = await getClientEventsCollection();
  const doc = await collection.findOne({ clientId: oid, eventCode });
  if (!doc) return apiError("Event not found", 404);

  // Cascade: drop all collections in the event database
  const collectionNames = Object.values(EVENT_COLLECTIONS);
  for (const colName of collectionNames) {
    try {
      const col = await getEventCollection(eventCode, colName);
      await col.drop();
    } catch {
      // Collection may not exist — ignore
    }
  }

  // Delete the event document
  await collection.deleteOne({ clientId: oid, eventCode });

  return NextResponse.json({ success: true });
}
