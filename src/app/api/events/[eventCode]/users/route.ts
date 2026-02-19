import { NextResponse } from "next/server";
import { requireEventAccess } from "@/lib/api-auth";
import { getEventCollection } from "@/lib/mongodb-collections";
import { serializeDocs } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ eventCode: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { eventCode } = await context.params;
  const auth = await requireEventAccess(request, eventCode);
  if (auth instanceof NextResponse) return auth;

  const col = await getEventCollection(eventCode, "users");
  const docs = await col.find().sort({ createdAt: -1 }).toArray();

  return NextResponse.json(serializeDocs(docs as Record<string, unknown>[]));
}
