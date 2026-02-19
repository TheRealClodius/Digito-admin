import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireEventAccess } from "@/lib/api-auth";
import { getEventCollection } from "@/lib/mongodb-collections";
import { serializeDoc, serializeDocs, parseObjectId, apiError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ eventCode: string; [key: string]: string }> };

interface EventEntityConfig {
  /** MongoDB collection name in the event database */
  collectionName: string;
  /** Fields that are allowed to be set/updated */
  allowedFields: string[];
  /** Fields that should be required on POST */
  requiredFields?: string[];
  /** Fields that contain date strings and should be converted to Date */
  dateFields?: string[];
  /** Default sort field */
  sortField?: string;
  /** Default sort direction */
  sortDirection?: 1 | -1;
}

/**
 * Creates standard GET (list), POST (create) handlers for an event entity.
 */
export function createEventListRoute(config: EventEntityConfig) {
  const {
    collectionName,
    allowedFields,
    requiredFields = [],
    dateFields = [],
    sortField = "createdAt",
    sortDirection = -1,
  } = config;

  async function GET(request: Request, context: RouteContext) {
    const auth = await requireEventAccess(request, (await context.params).eventCode);
    if (auth instanceof NextResponse) return auth;

    const { eventCode } = await context.params;
    const col = await getEventCollection(eventCode, collectionName);
    const docs = await col.find().sort({ [sortField]: sortDirection }).toArray();

    return NextResponse.json(serializeDocs(docs as Record<string, unknown>[]));
  }

  async function POST(request: Request, context: RouteContext) {
    const auth = await requireEventAccess(request, (await context.params).eventCode);
    if (auth instanceof NextResponse) return auth;

    const { eventCode } = await context.params;
    const body = await request.json();

    // Validate required fields
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== false && body[field] !== 0) {
        return apiError(`${field} is required`, 400);
      }
    }

    const now = new Date();
    const doc: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        doc[field] = dateFields.includes(field) && typeof body[field] === "string"
          ? new Date(body[field])
          : body[field];
      } else {
        doc[field] = null;
      }
    }
    doc.createdAt = now;
    doc.updatedAt = now;

    const col = await getEventCollection(eventCode, collectionName);
    const result = await col.insertOne(doc);

    return NextResponse.json(
      serializeDoc({ _id: result.insertedId, ...doc }),
      { status: 201 }
    );
  }

  return { GET, POST };
}

/**
 * Creates standard GET (single), PUT (update), DELETE handlers for an event entity.
 */
export function createEventItemRoute(config: EventEntityConfig) {
  const {
    collectionName,
    allowedFields,
    dateFields = [],
  } = config;

  async function GET(request: Request, context: RouteContext) {
    const params = await context.params;
    const auth = await requireEventAccess(request, params.eventCode);
    if (auth instanceof NextResponse) return auth;

    const oid = parseObjectId(params.id);
    if (!oid) return apiError("Invalid ID", 400);

    const col = await getEventCollection(params.eventCode, collectionName);
    const doc = await col.findOne({ _id: oid });
    if (!doc) return apiError("Not found", 404);

    return NextResponse.json(serializeDoc(doc as Record<string, unknown>));
  }

  async function PUT(request: Request, context: RouteContext) {
    const params = await context.params;
    const auth = await requireEventAccess(request, params.eventCode);
    if (auth instanceof NextResponse) return auth;

    const oid = parseObjectId(params.id);
    if (!oid) return apiError("Invalid ID", 400);

    const body = await request.json();

    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        update[field] = dateFields.includes(field) && typeof body[field] === "string"
          ? new Date(body[field])
          : body[field];
      }
    }
    update.updatedAt = new Date();

    const col = await getEventCollection(params.eventCode, collectionName);
    const result = await col.updateOne({ _id: oid }, { $set: update });
    if (result.matchedCount === 0) return apiError("Not found", 404);

    const updated = await col.findOne({ _id: oid });
    return NextResponse.json(serializeDoc(updated as Record<string, unknown>));
  }

  async function DELETE(request: Request, context: RouteContext) {
    const params = await context.params;
    const auth = await requireEventAccess(request, params.eventCode);
    if (auth instanceof NextResponse) return auth;

    const oid = parseObjectId(params.id);
    if (!oid) return apiError("Invalid ID", 400);

    const col = await getEventCollection(params.eventCode, collectionName);
    const result = await col.deleteOne({ _id: oid });
    if (result.deletedCount === 0) return apiError("Not found", 404);

    return NextResponse.json({ success: true });
  }

  return { GET, PUT, DELETE };
}
