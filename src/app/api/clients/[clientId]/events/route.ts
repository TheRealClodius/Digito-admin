import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  getClientsCollection,
  getClientEventsCollection,
} from "@/lib/mongodb-collections";
import { serializeDoc, serializeDocs, parseObjectId, apiError } from "@/lib/api-helpers";
import type { VerifiedCaller } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const caller = auth as VerifiedCaller;

  const { clientId } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  const collection = await getClientEventsCollection();
  const docs = await collection.find({ clientId: oid }).sort({ startDate: -1 }).toArray();

  // Filter by eventCodes for non-superadmin users with restricted access
  const filtered =
    caller.isSuperAdmin || caller.adminUser.eventCodes === null
      ? docs
      : docs.filter((d) => caller.adminUser.eventCodes!.includes(d.eventCode));

  return NextResponse.json(serializeDocs(filtered));
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { clientId } = await context.params;
  const oid = parseObjectId(clientId);
  if (!oid) return apiError("Invalid client ID", 400);

  // Verify client exists
  const clientsCol = await getClientsCollection();
  const client = await clientsCol.findOne({ _id: oid });
  if (!client) return apiError("Client not found", 404);

  const body = await request.json();
  const { eventCode, name, startDate, endDate } = body;

  if (!eventCode || !name || !startDate || !endDate) {
    return apiError("eventCode, name, startDate, and endDate are required", 400);
  }

  const now = new Date();
  const doc = {
    clientId: oid,
    eventCode,
    name,
    description: body.description ?? null,
    venue: body.venue ?? null,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    logoUrl: body.logoUrl ?? null,
    bannerUrl: body.bannerUrl ?? null,
    websiteUrl: body.websiteUrl ?? null,
    instagramUrl: body.instagramUrl ?? null,
    chatPrompt: body.chatPrompt ?? null,
    imageUrls: body.imageUrls ?? null,
    isActive: body.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const collection = await getClientEventsCollection();
  const result = await collection.insertOne(doc);

  return NextResponse.json(
    serializeDoc({ _id: result.insertedId, ...doc }),
    { status: 201 }
  );
}
