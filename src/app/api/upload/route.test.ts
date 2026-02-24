import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockGetSignedUrl = vi.fn();
const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = mockSend;
    },
    PutObjectCommand: class {
      input: unknown;
      constructor(input: unknown) { this.input = input; }
    },
    DeleteObjectCommand: class {
      input: unknown;
      constructor(input: unknown) { this.input = input; }
    },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

import { POST, DELETE } from "./route";

// === Helpers ===

function makeAuthCaller() {
  return {
    sub: "user-sub-123",
    email: "user@test.com",
    role: "clientAdmin" as const,
    isSuperAdmin: false,
    adminUser: {
      _id: new ObjectId(),
      cognitoSub: "user-sub-123",
      email: "user@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
      eventCodes: null,
      isActive: true,
      firstName: "Test",
      lastName: "User",
      language: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: "system",
    },
  };
}

function createPostRequest(body: unknown) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(key: string) {
  return new Request(`http://localhost/api/upload?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer token" },
  });
}

// === Tests ===

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set env vars for R2
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY = "test-key";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "digito-admin-dev";
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://pub-test.r2.dev";
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    );

    const res = await POST(createPostRequest({ filename: "test.png", contentType: "image/png", basePath: "clients" }));
    expect(res.status).toBe(401);
  });

  it("returns presigned URL and public URL for valid request", async () => {
    mockRequireAuth.mockResolvedValue(makeAuthCaller());
    mockGetSignedUrl.mockResolvedValue("https://presigned.example.com/upload");

    const res = await POST(createPostRequest({
      filename: "logo.png",
      contentType: "image/png",
      basePath: "clients",
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.presignedUrl).toBe("https://presigned.example.com/upload");
    expect(json.publicUrl).toContain("https://pub-test.r2.dev/");
    expect(json.publicUrl).toContain("clients/");
    expect(json.key).toContain("clients/");
  });

  it("returns 400 for missing required fields", async () => {
    mockRequireAuth.mockResolvedValue(makeAuthCaller());

    const res = await POST(createPostRequest({ filename: "test.png" }));
    expect(res.status).toBe(400);
  });

  it("sanitizes the filename", async () => {
    mockRequireAuth.mockResolvedValue(makeAuthCaller());
    mockGetSignedUrl.mockResolvedValue("https://presigned.example.com/upload");

    const res = await POST(createPostRequest({
      filename: "my file (1).png",
      contentType: "image/png",
      basePath: "clients",
    }));

    const json = await res.json();
    // sanitizeFilename replaces spaces and special chars
    expect(json.key).not.toContain(" ");
    expect(json.key).not.toContain("(");
  });
});

describe("DELETE /api/upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CLOUDFLARE_R2_ENDPOINT = "https://test.r2.cloudflarestorage.com";
    process.env.CLOUDFLARE_R2_ACCESS_KEY = "test-key";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.CLOUDFLARE_R2_BUCKET_NAME = "digito-admin-dev";
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://pub-test.r2.dev";
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    );

    const res = await DELETE(createDeleteRequest("clients/logo.png"));
    expect(res.status).toBe(401);
  });

  it("deletes object and returns 204", async () => {
    mockRequireAuth.mockResolvedValue(makeAuthCaller());
    mockSend.mockResolvedValue({});

    const res = await DELETE(createDeleteRequest("clients/logo.png"));
    expect(res.status).toBe(204);
    expect(mockSend).toHaveBeenCalled();
  });

  it("returns 400 when key is missing", async () => {
    mockRequireAuth.mockResolvedValue(makeAuthCaller());

    const req = new Request("http://localhost/api/upload", {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
