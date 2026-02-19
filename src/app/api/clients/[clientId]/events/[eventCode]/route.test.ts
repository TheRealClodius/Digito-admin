import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockClientEventsCollection = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
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

const clientId = new ObjectId();
const clientIdStr = clientId.toHexString();
const eventId = new ObjectId();

function routeContext(eventCode = "2025001") {
  return { params: Promise.resolve({ clientId: clientIdStr, eventCode }) };
}

function createRequest(method: string, body?: Record<string, unknown>) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/clients/abc/events/2025001", init);
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

const sampleEvent = {
  _id: eventId,
  clientId,
  eventCode: "2025001",
  name: "Test Event",
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
};

// === Tests ===

describe("GET /api/clients/[clientId]/events/[eventCode]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const req = createRequest("GET");
    const res = await GET(req, routeContext());
    expect(res.status).toBe(401);
  });

  it("returns 404 when event not found", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.findOne.mockResolvedValue(null);

    const req = createRequest("GET");
    const res = await GET(req, routeContext());
    expect(res.status).toBe(404);
  });

  it("returns serialized event", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.findOne.mockResolvedValue(sampleEvent);

    const req = createRequest("GET");
    const res = await GET(req, routeContext());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe(eventId.toHexString());
    expect(json.name).toBe("Test Event");
    expect(json.eventCode).toBe("2025001");
    expect(json).not.toHaveProperty("_id");
  });
});

describe("PUT /api/clients/[clientId]/events/[eventCode]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when event not found", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.updateOne.mockResolvedValue({ matchedCount: 0 });

    const req = createRequest("PUT", { name: "Updated" });
    const res = await PUT(req, routeContext());
    expect(res.status).toBe(404);
  });

  it("updates event and returns updated document", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockClientEventsCollection.findOne.mockResolvedValue({
      ...sampleEvent,
      name: "Updated Event",
    });

    const req = createRequest("PUT", { name: "Updated Event" });
    const res = await PUT(req, routeContext());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.name).toBe("Updated Event");
  });

  it("only updates allowed fields", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockClientEventsCollection.findOne.mockResolvedValue(sampleEvent);

    const req = createRequest("PUT", {
      name: "Updated",
      _id: "hacked",
      clientId: "hacked",
      eventCode: "hacked",
    });
    const res = await PUT(req, routeContext());
    expect(res.status).toBe(200);

    const setArg = mockClientEventsCollection.updateOne.mock.calls[0][1].$set;
    expect(setArg).not.toHaveProperty("_id");
    expect(setArg).not.toHaveProperty("clientId");
    expect(setArg).not.toHaveProperty("eventCode");
  });

  it("converts date strings to Date objects", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockClientEventsCollection.findOne.mockResolvedValue(sampleEvent);

    const req = createRequest("PUT", {
      startDate: "2025-06-01T00:00:00Z",
      endDate: "2025-06-03T00:00:00Z",
    });
    const res = await PUT(req, routeContext());
    expect(res.status).toBe(200);

    const setArg = mockClientEventsCollection.updateOne.mock.calls[0][1].$set;
    expect(setArg.startDate).toBeInstanceOf(Date);
    expect(setArg.endDate).toBeInstanceOf(Date);
  });
});

describe("DELETE /api/clients/[clientId]/events/[eventCode]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when event not found", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.findOne.mockResolvedValue(null);

    const req = createRequest("DELETE");
    const res = await DELETE(req, routeContext());
    expect(res.status).toBe(404);
  });

  it("deletes event and cascades to event collections", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.findOne.mockResolvedValue(sampleEvent);
    mockClientEventsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const req = createRequest("DELETE");
    const res = await DELETE(req, routeContext());
    expect(res.status).toBe(200);

    expect(mockClientEventsCollection.deleteOne).toHaveBeenCalledWith({
      clientId,
      eventCode: "2025001",
    });
  });
});
