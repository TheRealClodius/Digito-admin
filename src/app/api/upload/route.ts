import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "@/lib/api-auth";
import { apiError } from "@/lib/api-helpers";
import { sanitizeFilename } from "@/lib/validation";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucket() {
  return process.env.CLOUDFLARE_R2_BUCKET_NAME!;
}

function getPublicUrl() {
  return process.env.CLOUDFLARE_R2_PUBLIC_URL!;
}

/**
 * POST /api/upload
 * Generate a presigned URL for direct client upload to R2.
 * Body: { filename: string, contentType: string, basePath: string }
 * Returns: { presignedUrl: string, publicUrl: string, key: string }
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { filename, contentType, basePath } = body;

  if (!filename || typeof filename !== "string" || !contentType || typeof contentType !== "string" || !basePath || typeof basePath !== "string") {
    return apiError("Missing required fields: filename, contentType, basePath", 400);
  }

  const sanitized = sanitizeFilename(filename);
  const timestamp = Date.now();
  const key = `${basePath}/${timestamp}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 600 });
  const publicUrl = `${getPublicUrl()}/${key}`;

  return NextResponse.json({ presignedUrl, publicUrl, key });
}

/**
 * DELETE /api/upload?key=...
 * Delete a file from R2.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return apiError("Missing required query parameter: key", 400);
  }

  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  await getR2Client().send(command);

  return new NextResponse(null, { status: 204 });
}
