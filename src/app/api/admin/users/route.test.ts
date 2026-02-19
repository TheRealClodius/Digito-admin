import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireRole = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

const mockCollection = {
  find: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getAdminUsersCollection: () => Promise.resolve(mockCollection),
}));

import { GET } from "./route";

// === Helpers ===

function createRequest() {
  return new Request("http://localhost/api/admin/users", {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });
}

function makeSuperadminCaller() {
  return {
    sub: "superadmin-sub",
    email: "admin@test.com",
    role: "superadmin" as const,
    isSuperAdmin: true,
    adminUser: {
      _id: new ObjectId(),
      cognitoSub: "superadmin-sub",
      email: "admin@test.com",
      role: "superadmin",
      clientIds: null,
      eventCodes: null,
      isActive: true,
      firstName: "Admin",
      lastName: "User",
      language: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: "system",
    },
  };
}

// === Tests ===

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 for non-superadmin", async () => {
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    );

    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it("returns serialized admin users sorted by email", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const docs = [
      {
        _id: new ObjectId(),
        cognitoSub: "sub-1",
        email: "alice@test.com",
        role: "clientAdmin",
        clientIds: ["client-1"],
        eventCodes: null,
        firstName: "Alice",
        lastName: "Smith",
        isActive: true,
        language: "en",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        createdBy: "system",
        updatedBy: "system",
      },
      {
        _id: new ObjectId(),
        cognitoSub: "sub-2",
        email: "bob@test.com",
        role: "eventAdmin",
        clientIds: ["client-1"],
        eventCodes: ["2025001"],
        firstName: "Bob",
        lastName: "Jones",
        isActive: true,
        language: "it",
        createdAt: new Date("2025-02-01"),
        updatedAt: new Date("2025-02-01"),
        createdBy: "system",
        updatedBy: "system",
      },
    ];
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) }),
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe(docs[0]._id.toHexString());
    expect(json[0].email).toBe("alice@test.com");
    expect(json[0].role).toBe("clientAdmin");
    expect(json[0]).not.toHaveProperty("_id");
  });

  it("only returns active users", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    });

    await GET(createRequest());

    expect(mockCollection.find).toHaveBeenCalledWith({ isActive: true });
  });
});
