import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockClientsCollection = { findOne: vi.fn() };
const mockClientEventsCollection = {
  find: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getClientsCollection: () => Promise.resolve(mockClientsCollection),
  getClientEventsCollection: () => Promise.resolve(mockClientEventsCollection),
}));

import { GET, POST } from "./route";

// === Helpers ===

const clientId = new ObjectId();
const clientIdStr = clientId.toHexString();
const routeContext = { params: Promise.resolve({ clientId: clientIdStr }) };

function createRequest(
  method: string,
  body?: Record<string, unknown>,
) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/clients/abc/events", init);
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

function makeClientAdminCaller() {
  return {
    sub: "clientadmin-sub",
    email: "clientadmin@test.com",
    role: "clientAdmin" as const,
    isSuperAdmin: false,
    adminUser: {
      _id: new ObjectId(),
      cognitoSub: "clientadmin-sub",
      email: "clientadmin@test.com",
      role: "clientAdmin",
      clientIds: [clientIdStr],
      eventCodes: null,
      isActive: true,
      firstName: "Client",
      lastName: "Admin",
      language: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: "system",
    },
  };
}

// === Tests ===

describe("GET /api/clients/[clientId]/events", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const req = createRequest("GET");
    const res = await GET(req, routeContext);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid clientId", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    const req = createRequest("GET");
    const res = await GET(req, { params: Promise.resolve({ clientId: "bad" }) });
    expect(res.status).toBe(400);
  });

  it("returns serialized events for superadmin", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    const eventId = new ObjectId();
    mockClientEventsCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: eventId,
            clientId,
            eventCode: "2025001",
            name: "Event One",
            description: null,
            venue: "Rome",
            startDate: new Date("2025-03-01"),
            endDate: new Date("2025-03-03"),
            logoUrl: null,
            bannerUrl: null,
            websiteUrl: null,
            instagramUrl: null,
            chatPrompt: null,
            imageUrls: null,
            isActive: true,
            createdAt: new Date("2025-01-01"),
            updatedAt: new Date("2025-01-01"),
          },
        ]),
      }),
    });

    const req = createRequest("GET");
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe(eventId.toHexString());
    expect(json[0].name).toBe("Event One");
    expect(json[0].eventCode).toBe("2025001");
    expect(json[0]).not.toHaveProperty("_id");
  });

  it("filters events by eventCodes for non-superadmin", async () => {
    const caller = makeClientAdminCaller();
    caller.adminUser.eventCodes = ["2025001"];
    caller.role = "eventAdmin";
    mockRequireAuth.mockResolvedValue(caller);

    const events = [
      { _id: new ObjectId(), clientId, eventCode: "2025001", name: "Allowed" },
      { _id: new ObjectId(), clientId, eventCode: "2025002", name: "Not Allowed" },
    ];
    mockClientEventsCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(events),
      }),
    });

    const req = createRequest("GET");
    const res = await GET(req, routeContext);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe("Allowed");
  });
});

describe("POST /api/clients/[clientId]/events", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue({ _id: clientId });

    const req = createRequest("POST", { description: "no name" });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue(null);

    const req = createRequest("POST", {
      eventCode: "2025001",
      name: "New Event",
      startDate: "2025-03-01T00:00:00Z",
      endDate: "2025-03-03T00:00:00Z",
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(404);
  });

  it("creates an event and returns serialized document", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientsCollection.findOne.mockResolvedValue({ _id: clientId });

    const insertedId = new ObjectId();
    mockClientEventsCollection.insertOne.mockResolvedValue({ insertedId });

    const req = createRequest("POST", {
      eventCode: "2025001",
      name: "New Event",
      description: "A description",
      venue: "Milan",
      startDate: "2025-03-01T00:00:00Z",
      endDate: "2025-03-03T00:00:00Z",
      isActive: true,
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toBe(insertedId.toHexString());
    expect(json.name).toBe("New Event");
    expect(json.eventCode).toBe("2025001");

    expect(mockClientEventsCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId,
        eventCode: "2025001",
        name: "New Event",
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      })
    );
  });
});
