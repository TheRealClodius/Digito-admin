import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/api-auth";
import { getEventCollection } from "@/lib/mongodb-collections";
import { serializeDoc, serializeDocs } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ eventCode: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { eventCode } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const col = await getEventCollection(eventCode, "whitelist");
  const docs = await col.find().sort({ addedAt: -1 }).toArray();

  return NextResponse.json(serializeDocs(docs as Record<string, unknown>[]));
}

export async function POST(request: Request, context: RouteContext) {
  const { eventCode } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const now = new Date();
  const whitelistDoc: Record<string, unknown> = {
    email: email.toLowerCase(),
    firstName: body.firstName ?? null,
    lastName: body.lastName ?? null,
    accessTier: body.accessTier ?? null,
    company: body.company ?? null,
    jobTitle: body.jobTitle ?? null,
    phone: body.phone ?? null,
    notes: body.notes ?? null,
    addedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const whitelistCol = await getEventCollection(eventCode, "whitelist");
  const result = await whitelistCol.insertOne(whitelistDoc);

  // Sync locked fields to users collection
  const usersCol = await getEventCollection(eventCode, "users");
  const lockedFields: Record<string, unknown> = {};
  if (body.firstName) lockedFields.firstName = body.firstName;
  if (body.lastName) lockedFields.lastName = body.lastName;
  if (body.company) lockedFields.company = body.company;
  if (body.jobTitle) lockedFields.jobTitle = body.jobTitle;

  if (Object.keys(lockedFields).length > 0) {
    await usersCol.updateOne(
      { email: email.toLowerCase() },
      { $set: lockedFields },
    ).catch(() => {}); // best-effort sync
  }

  return NextResponse.json(
    serializeDoc({ _id: result.insertedId, ...whitelistDoc }),
    { status: 201 }
  );
}
