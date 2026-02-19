import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  getClientsCollection,
  getClientEventsCollection,
  getEventCollection,
  EVENT_COLLECTIONS,
} from "@/lib/mongodb-collections";
import { serializeDoc, parseObjectId, apiError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ clientId: string }> };

const ALLOWED_FIELDS = ["name", "description", "logoUrl"];

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const collection = await getClientsCollection();
  const doc = await collection.findOne({ _id: oid });
  if (!doc) return apiError("Client not found", 404);

  return NextResponse.json(serializeDoc(doc));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const body = await request.json();

  // Only allow known fields
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      update[field] = body[field];
    }
  }
  update.updatedAt = new Date();

  const collection = await getClientsCollection();
  const result = await collection.updateOne({ _id: oid }, { $set: update });
  if (result.matchedCount === 0) return apiError("Client not found", 404);

  const updated = await collection.findOne({ _id: oid });
  return NextResponse.json(serializeDoc(updated!));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const clientsCol = await getClientsCollection();
  const client = await clientsCol.findOne({ _id: oid });
  if (!client) return apiError("Client not found", 404);

  // Cascade: delete all event collections for associated events
  const clientEventsCol = await getClientEventsCollection();
  const events = await clientEventsCol.find({ clientId: oid }).toArray();

  for (const event of events) {
    // Drop each collection in the event database
    const collectionNames = Object.values(EVENT_COLLECTIONS);
    for (const colName of collectionNames) {
      try {
        const col = await getEventCollection(event.eventCode, colName);
        await col.drop();
      } catch {
        // Collection may not exist — ignore
      }
    }
  }

  // Delete all clientEvents records for this client
  await clientEventsCol.deleteMany({ clientId: oid });

  // Delete the client itself
  await clientsCol.deleteOne({ _id: oid });

  return NextResponse.json({ success: true });
}
