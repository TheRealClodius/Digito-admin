import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockCollection = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getAdminUsersCollection: () => Promise.resolve(mockCollection),
}));

import { GET, PATCH } from "./route";

// === Helpers ===

function createRequest(method = "GET", body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { Authorization: "Bearer token" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  return new Request("http://localhost/api/admin/users/me", init);
}

const userId = new ObjectId();

function makeAuthCaller() {
  return {
    sub: "user-sub-123",
    email: "user@test.com",
    role: "clientAdmin" as const,
    isSuperAdmin: false,
    adminUser: {
      _id: userId,
      cognitoSub: "user-sub-123",
      email: "user@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
      eventCodes: null,
      isActive: true,
      firstName: "Test",
      lastName: "User",
      language: "en",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      createdBy: "system",
      updatedBy: "system",
    },
  };
}

// === Tests ===

describe("GET /api/admin/users/me", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    );

    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user profile", async () => {
    const caller = makeAuthCaller();
    mockRequireAuth.mockResolvedValue(caller);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe(userId.toHexString());
    expect(json.email).toBe("user@test.com");
    expect(json.language).toBe("en");
    expect(json.firstName).toBe("Test");
    expect(json.lastName).toBe("User");
    expect(json.role).toBe("clientAdmin");
    expect(json).not.toHaveProperty("_id");
  });
});

describe("PATCH /api/admin/users/me", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    );

    const res = await PATCH(createRequest("PATCH", { language: "it" }));
    expect(res.status).toBe(401);
  });

  it("updates language preference", async () => {
    const caller = makeAuthCaller();
    mockRequireAuth.mockResolvedValue(caller);
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await PATCH(createRequest("PATCH", { language: "it" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.language).toBe("it");

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { _id: userId },
      {
        $set: expect.objectContaining({
          language: "it",
          updatedBy: "user-sub-123",
        }),
      }
    );
  });

  it("rejects invalid language value", async () => {
    const caller = makeAuthCaller();
    mockRequireAuth.mockResolvedValue(caller);

    const res = await PATCH(createRequest("PATCH", { language: "fr" }));
    expect(res.status).toBe(400);
  });

  it("rejects empty body", async () => {
    const caller = makeAuthCaller();
    mockRequireAuth.mockResolvedValue(caller);

    const res = await PATCH(createRequest("PATCH", {}));
    expect(res.status).toBe(400);
  });
});
