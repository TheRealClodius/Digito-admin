import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { getAdminUsersCollection } from "@/lib/mongodb-collections";
import { serializeDocs } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const collection = await getAdminUsersCollection();
  const docs = await collection.find({ isActive: true }).sort({ email: 1 }).toArray();

  return NextResponse.json(serializeDocs(docs));
}
