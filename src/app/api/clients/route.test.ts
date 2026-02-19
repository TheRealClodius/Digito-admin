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
  insertOne: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getClientsCollection: () => Promise.resolve(mockCollection),
}));

import { GET, POST } from "./route";

// === Helpers ===

function createRequest(
  method: string,
  body?: Record<string, unknown>,
  url = "http://localhost/api/clients"
) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
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

describe("GET /api/clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 for non-superadmin", async () => {
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    );

    const req = createRequest("GET");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns serialized clients sorted by name", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const docs = [
      { _id: new ObjectId(), name: "Alpha", description: null, logoUrl: null, createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01") },
      { _id: new ObjectId(), name: "Beta", description: "desc", logoUrl: "https://logo.png", createdAt: new Date("2025-02-01"), updatedAt: new Date("2025-02-01") },
    ];
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) }),
    });

    const req = createRequest("GET");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].name).toBe("Alpha");
    expect(json[0].id).toBe(docs[0]._id.toHexString());
    expect(json[0]).not.toHaveProperty("_id");
    expect(json[1].logoUrl).toBe("https://logo.png");
  });
});

describe("POST /api/clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 for non-superadmin", async () => {
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    );

    const req = createRequest("POST", { name: "New Client" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const req = createRequest("POST", { description: "no name" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty string", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const req = createRequest("POST", { name: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates a client and returns serialized document", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const insertedId = new ObjectId();
    mockCollection.insertOne.mockResolvedValue({ insertedId });

    const req = createRequest("POST", {
      name: "New Client",
      description: "A description",
      logoUrl: "https://logo.png",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toBe(insertedId.toHexString());
    expect(json.name).toBe("New Client");
    expect(json.description).toBe("A description");
    expect(json.logoUrl).toBe("https://logo.png");
    expect(json.createdAt).toBeDefined();
    expect(json.updatedAt).toBeDefined();

    // Verify insertOne was called with correct shape
    expect(mockCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Client",
        description: "A description",
        logoUrl: "https://logo.png",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    );
  });

  it("defaults description and logoUrl to null", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const insertedId = new ObjectId();
    mockCollection.insertOne.mockResolvedValue({ insertedId });

    const req = createRequest("POST", { name: "Minimal" });
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(mockCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Minimal",
        description: null,
        logoUrl: null,
      })
    );
  });
});
