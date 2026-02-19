import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireRole = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

const mockClientsCollection = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
};
const mockClientEventsCollection = {
  find: vi.fn(),
  deleteMany: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getClientsCollection: () => Promise.resolve(mockClientsCollection),
  getClientEventsCollection: () => Promise.resolve(mockClientEventsCollection),
  getEventCollection: () => Promise.resolve({ drop: vi.fn().mockResolvedValue(undefined) }),
  EVENT_COLLECTIONS: {
    BRANDS: "brands",
    SESSIONS: "sessions",
    HAPPENINGS: "happenings",
    PARTICIPANTS: "participants",
    POSTS: "posts",
    WHITELIST: "whitelist",
    STANDS: "stands",
    USERS: "users",
    FEEDBACK: "feedback",
  },
}));

import { GET, PUT, DELETE } from "./route";

// === Helpers ===

function createRequest(
  method: string,
  body?: Record<string, unknown>,
  url = "http://localhost/api/clients/abc"
) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

const clientId = new ObjectId();
const clientIdStr = clientId.toHexString();

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

const routeContext = { params: Promise.resolve({ clientId: clientIdStr }) };
const invalidContext = { params: Promise.resolve({ clientId: "not-valid-id" }) };

// === Tests ===

describe("GET /api/clients/[clientId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 for non-superadmin", async () => {
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    );

    const req = createRequest("GET");
    const res = await GET(req, routeContext);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid ObjectId", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const req = createRequest("GET");
    const res = await GET(req, invalidContext);
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue(null);

    const req = createRequest("GET");
    const res = await GET(req, routeContext);
    expect(res.status).toBe(404);
  });

  it("returns serialized client", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue({
      _id: clientId,
      name: "Test Client",
      description: "desc",
      logoUrl: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    });

    const req = createRequest("GET");
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe(clientIdStr);
    expect(json.name).toBe("Test Client");
    expect(json).not.toHaveProperty("_id");
  });
});

describe("PUT /api/clients/[clientId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 for invalid ObjectId", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const req = createRequest("PUT", { name: "Updated" });
    const res = await PUT(req, invalidContext);
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.updateOne.mockResolvedValue({ matchedCount: 0 });

    const req = createRequest("PUT", { name: "Updated" });
    const res = await PUT(req, routeContext);
    expect(res.status).toBe(404);
  });

  it("updates client and returns updated document", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockClientsCollection.findOne.mockResolvedValue({
      _id: clientId,
      name: "Updated",
      description: "new desc",
      logoUrl: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-06-01"),
    });

    const req = createRequest("PUT", { name: "Updated", description: "new desc" });
    const res = await PUT(req, routeContext);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.name).toBe("Updated");

    expect(mockClientsCollection.updateOne).toHaveBeenCalledWith(
      { _id: clientId },
      {
        $set: expect.objectContaining({
          name: "Updated",
          description: "new desc",
          updatedAt: expect.any(Date),
        }),
      }
    );
  });

  it("only updates allowed fields", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockClientsCollection.findOne.mockResolvedValue({
      _id: clientId,
      name: "Test",
      description: null,
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createRequest("PUT", {
      name: "Test",
      _id: "hacked",
      createdAt: "hacked",
      somethingElse: "bad",
    });
    const res = await PUT(req, routeContext);
    expect(res.status).toBe(200);

    const setArg = mockClientsCollection.updateOne.mock.calls[0][1].$set;
    expect(setArg).not.toHaveProperty("_id");
    expect(setArg).not.toHaveProperty("createdAt");
    expect(setArg).not.toHaveProperty("somethingElse");
  });
});

describe("DELETE /api/clients/[clientId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 for invalid ObjectId", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());

    const req = createRequest("DELETE");
    const res = await DELETE(req, invalidContext);
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue(null);

    const req = createRequest("DELETE");
    const res = await DELETE(req, routeContext);
    expect(res.status).toBe(404);
  });

  it("cascade deletes client and associated events", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue({
      _id: clientId,
      name: "Client to Delete",
    });
    mockClientEventsCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: new ObjectId(), clientId, eventCode: "2025001", eventName: "Event 1" },
      ]),
    });
    mockClientsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockClientEventsCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });

    const req = createRequest("DELETE");
    const res = await DELETE(req, routeContext);
    expect(res.status).toBe(200);

    // Verify cascade: delete clientEvents and client doc
    expect(mockClientEventsCollection.deleteMany).toHaveBeenCalledWith({ clientId });
    expect(mockClientsCollection.deleteOne).toHaveBeenCalledWith({ _id: clientId });
  });

  it("deletes client with no events", async () => {
    mockRequireRole.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue({
      _id: clientId,
      name: "Client No Events",
    });
    mockClientEventsCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    mockClientsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockClientEventsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });

    const req = createRequest("DELETE");
    const res = await DELETE(req, routeContext);
    expect(res.status).toBe(200);
  });
});
