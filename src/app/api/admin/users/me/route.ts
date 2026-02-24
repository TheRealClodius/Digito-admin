import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAdminUsersCollection } from "@/lib/mongodb-collections";
import { serializeDoc, apiError } from "@/lib/api-helpers";

const VALID_LANGUAGES = ["en", "it"] as const;

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(serializeDoc(auth.adminUser as unknown as Record<string, unknown>));
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  // Only allow updating language for now
  const { language } = body;

  if (!language || !VALID_LANGUAGES.includes(language as typeof VALID_LANGUAGES[number])) {
    return apiError("Invalid or missing language. Must be 'en' or 'it'.", 400);
  }

  const collection = await getAdminUsersCollection();
  await collection.updateOne(
    { _id: auth.adminUser._id },
    {
      $set: {
        language: language as typeof VALID_LANGUAGES[number],
        updatedAt: new Date(),
        updatedBy: auth.sub,
      },
    }
  );

  return NextResponse.json({ language });
}
