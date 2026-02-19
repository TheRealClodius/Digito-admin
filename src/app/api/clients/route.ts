import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { getClientsCollection } from "@/lib/mongodb-collections";
import { serializeDoc, serializeDocs } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const collection = await getClientsCollection();
  const docs = await collection.find().sort({ name: 1 }).toArray();

  return NextResponse.json(serializeDocs(docs));
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { name, description, logoUrl } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const now = new Date();
  const doc = {
    name: name.trim(),
    description: description ?? null,
    logoUrl: logoUrl ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const collection = await getClientsCollection();
  const result = await collection.insertOne(doc);

  return NextResponse.json(
    serializeDoc({ _id: result.insertedId, ...doc }),
    { status: 201 }
  );
}
