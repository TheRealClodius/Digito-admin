import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireEventAccess = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireEventAccess: (...args: unknown[]) => mockRequireEventAccess(...args),
}));

const mockCollection = {
  find: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getEventCollection: () => Promise.resolve(mockCollection),
}));

import { createEventListRoute, createEventItemRoute } from "./event-route-helpers";

// === Setup ===

const config = {
  collectionName: "brands",
  allowedFields: ["name", "logoUrl", "startTime"],
  requiredFields: ["name"],
  dateFields: ["startTime"],
  sortField: "name",
  sortDirection: 1 as const,
};

const { GET: listGET, POST: listPOST } = createEventListRoute(config);
const { GET: itemGET, PUT: itemPUT, DELETE: itemDELETE } = createEventItemRoute(config);

const docId = new ObjectId();
const docIdStr = docId.toHexString();
const listContext = { params: Promise.resolve({ eventCode: "2025001" }) };
const itemContext = { params: Promise.resolve({ eventCode: "2025001", id: docIdStr }) };
const badIdContext = { params: Promise.resolve({ eventCode: "2025001", id: "bad" }) };

function makeCaller() {
  return {
    sub: "sub",
    email: "admin@test.com",
    role: "superadmin" as const,
    isSuperAdmin: true,
    adminUser: {} as any,
  };
}

function createRequest(method: string, body?: Record<string, unknown>) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/events/2025001/brands", init);
}

// === Tests ===

describe("createEventListRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns 401 without auth", async () => {
    mockRequireEventAccess.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await listGET(createRequest("GET"), listContext);
    expect(res.status).toBe(401);
  });

  it("GET returns serialized docs", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: docId, name: "Brand A", logoUrl: null, createdAt: new Date() },
        ]),
      }),
    });

    const res = await listGET(createRequest("GET"), listContext);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe(docIdStr);
    expect(json[0].name).toBe("Brand A");
  });

  it("POST returns 400 for missing required field", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    const res = await listPOST(createRequest("POST", { logoUrl: "url" }), listContext);
    expect(res.status).toBe(400);
  });

  it("POST creates doc and converts date fields", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    const insertedId = new ObjectId();
    mockCollection.insertOne.mockResolvedValue({ insertedId });

    const res = await listPOST(
      createRequest("POST", { name: "Brand B", startTime: "2025-03-01T10:00:00Z" }),
      listContext
    );
    expect(res.status).toBe(201);

    const inserted = mockCollection.insertOne.mock.calls[0][0];
    expect(inserted.name).toBe("Brand B");
    expect(inserted.startTime).toBeInstanceOf(Date);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });
});

describe("createEventItemRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns 400 for invalid ID", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    const res = await itemGET(createRequest("GET"), badIdContext);
    expect(res.status).toBe(400);
  });

  it("GET returns 404 when not found", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    mockCollection.findOne.mockResolvedValue(null);
    const res = await itemGET(createRequest("GET"), itemContext);
    expect(res.status).toBe(404);
  });

  it("GET returns serialized doc", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    mockCollection.findOne.mockResolvedValue({ _id: docId, name: "Brand A" });

    const res = await itemGET(createRequest("GET"), itemContext);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(docIdStr);
  });

  it("PUT updates allowed fields only", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    mockCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockCollection.findOne.mockResolvedValue({ _id: docId, name: "Updated" });

    const res = await itemPUT(
      createRequest("PUT", { name: "Updated", _id: "hacked" }),
      itemContext
    );
    expect(res.status).toBe(200);

    const setArg = mockCollection.updateOne.mock.calls[0][1].$set;
    expect(setArg.name).toBe("Updated");
    expect(setArg).not.toHaveProperty("_id");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("DELETE returns 404 when not found", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const res = await itemDELETE(createRequest("DELETE"), itemContext);
    expect(res.status).toBe(404);
  });

  it("DELETE deletes doc", async () => {
    mockRequireEventAccess.mockResolvedValue(makeCaller());
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const res = await itemDELETE(createRequest("DELETE"), itemContext);
    expect(res.status).toBe(200);
    expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: docId });
  });
});
