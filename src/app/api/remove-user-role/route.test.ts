import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { VerifiedCaller } from "@/lib/api-auth";
import type { ObjectId as ObjectIdType } from "mongodb";

// === Mocks ===

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockDisableCognitoUser = vi.fn();
vi.mock("@/lib/cognito-admin", () => ({
  disableCognitoUser: (...args: unknown[]) => mockDisableCognitoUser(...args),
}));

const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
vi.mock("@/lib/mongodb-collections", () => ({
  getAdminUsersCollection: vi.fn(async () => ({
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
  })),
}));

const mockObjectIdIsValid = vi.fn();
vi.mock("mongodb", () => {
  const FakeObjectId = function (this: { id: string }, id: string) {
    this.id = id;
  } as unknown as new (id: string) => ObjectIdType;
  (FakeObjectId as unknown as Record<string, unknown>).isValid = (
    ...args: unknown[]
  ) => mockObjectIdIsValid(...args);
  return { ObjectId: FakeObjectId };
});

import { DELETE } from "./route";

// === Helpers ===

function createRequest(
  body: Record<string, unknown>,
  token: string | null = "valid-token"
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/remove-user-role", {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
}

function makeCaller(overrides: Partial<VerifiedCaller> = {}): VerifiedCaller {
  return {
    sub: "caller-sub",
    email: "caller@test.com",
    role: "superadmin",
    isSuperAdmin: true,
    adminUser: {
      _id: "caller-oid" as unknown as ObjectIdType,
      cognitoSub: "caller-sub",
      email: "caller@test.com",
      role: "superadmin",
      clientIds: null,
      eventCodes: null,
      firstName: "Super",
      lastName: "Admin",
      isActive: true,
      language: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: "system",
    },
    ...overrides,
  };
}

function superadminCaller(): VerifiedCaller {
  return makeCaller();
}

function clientAdminCaller(): VerifiedCaller {
  return makeCaller({
    sub: "clientadmin-sub",
    email: "clientadmin@test.com",
    role: "clientAdmin",
    isSuperAdmin: false,
    adminUser: {
      _id: "clientadmin-oid" as unknown as ObjectIdType,
      cognitoSub: "clientadmin-sub",
      email: "clientadmin@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
      eventCodes: null,
      firstName: "Client",
      lastName: "Admin",
      isActive: true,
      language: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: "system",
    },
  });
}

function eventAdminCaller(): VerifiedCaller {
  return makeCaller({
    sub: "eventadmin-sub",
    email: "eventadmin@test.com",
    role: "eventAdmin",
    isSuperAdmin: false,
    adminUser: {
      _id: "eventadmin-oid" as unknown as ObjectIdType,
      cognitoSub: "eventadmin-sub",
      email: "eventadmin@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventCodes: ["event-1"],
      firstName: "Event",
      lastName: "Admin",
      isActive: true,
      language: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system",
      updatedBy: "system",
    },
  });
}

function makeTargetUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: "target-oid",
    cognitoSub: "target-sub",
    email: "target@test.com",
    role: "eventAdmin",
    clientIds: ["client-1"],
    eventCodes: ["event-1"],
    isActive: true,
    ...overrides,
  };
}

// === Tests ===

describe("DELETE /api/remove-user-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mockDisableCognitoUser.mockResolvedValue(undefined);
    mockObjectIdIsValid.mockReturnValue(false);
  });

  // --- Authentication ---

  it("returns 401 when requireAuth returns an error response", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    );
    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  // --- Validation ---

  it("returns 400 when userId is missing", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    const req = createRequest({});
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/userId/i);
  });

  it("returns 400 when userId is not a string", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    const req = createRequest({ userId: 12345 });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  // --- Target user lookup ---

  it("looks up target user by ObjectId when valid", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(true);
    const target = makeTargetUser();
    mockFindOne.mockResolvedValueOnce(target); // found by ObjectId
    const req = createRequest({ userId: "507f1f77bcf86cd799439011" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockObjectIdIsValid).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    // findOne called once (ObjectId match succeeded)
    expect(mockFindOne).toHaveBeenCalledTimes(1);
  });

  it("falls back to cognitoSub lookup when ObjectId lookup fails", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(true);
    const target = makeTargetUser();
    mockFindOne
      .mockResolvedValueOnce(null) // ObjectId lookup: not found
      .mockResolvedValueOnce(target); // cognitoSub lookup: found
    const req = createRequest({ userId: "some-cognito-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledTimes(2);
    expect(mockFindOne).toHaveBeenCalledWith({ cognitoSub: "some-cognito-sub" });
  });

  it("falls back to email lookup when ObjectId and cognitoSub fail", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(false); // not a valid ObjectId
    const target = makeTargetUser({ email: "target@test.com" });
    mockFindOne
      .mockResolvedValueOnce(null) // cognitoSub lookup: not found
      .mockResolvedValueOnce(target); // email lookup: found
    const req = createRequest({ userId: "Target@Test.com" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({
      email: "target@test.com",
    });
  });

  it("returns 404 when target user is not found by any method", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    mockFindOne.mockResolvedValue(null);
    const req = createRequest({ userId: "nonexistent" });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  // --- Authorization: cannot remove superadmin ---

  it("returns 403 when trying to remove a superadmin", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({ role: "superadmin" });
    mockFindOne.mockResolvedValueOnce(target);
    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/superadmin/i);
  });

  // --- Authorization: role-based restrictions ---

  it("returns 403 when eventAdmin tries to remove a role", async () => {
    mockRequireAuth.mockResolvedValue(eventAdminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({ role: "eventAdmin" });
    mockFindOne.mockResolvedValueOnce(target);
    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/superadmins and clientAdmins/i);
  });

  // --- Authorization: clientAdmin restrictions ---

  it("returns 403 when clientAdmin tries to remove a clientAdmin", async () => {
    mockRequireAuth.mockResolvedValue(clientAdminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({ role: "clientAdmin", clientIds: ["client-1"] });
    mockFindOne.mockResolvedValueOnce(target);
    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/eventAdmin/i);
  });

  it("returns 403 when clientAdmin tries to remove eventAdmin from unassigned client", async () => {
    mockRequireAuth.mockResolvedValue(clientAdminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({
      role: "eventAdmin",
      clientIds: ["other-client"],
    });
    mockFindOne.mockResolvedValueOnce(target);
    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/within your clients/i);
  });

  it("returns 403 when clientAdmin and target has mixed clients (partial overlap)", async () => {
    mockRequireAuth.mockResolvedValue(clientAdminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({
      role: "eventAdmin",
      clientIds: ["client-1", "other-client"],
    });
    mockFindOne.mockResolvedValueOnce(target);
    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  // --- Success paths ---

  it("superadmin can remove a clientAdmin", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({ role: "clientAdmin", clientIds: ["client-1"] });
    mockFindOne.mockResolvedValueOnce(target);

    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify MongoDB deactivation
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: target._id },
      {
        $set: {
          isActive: false,
          updatedAt: expect.any(Date),
          updatedBy: "caller-sub",
        },
      }
    );

    // Verify Cognito disable
    expect(mockDisableCognitoUser).toHaveBeenCalledWith("target@test.com");
  });

  it("superadmin can remove an eventAdmin", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventCodes: ["event-1"],
    });
    mockFindOne.mockResolvedValueOnce(target);

    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: target._id },
      {
        $set: {
          isActive: false,
          updatedAt: expect.any(Date),
          updatedBy: "caller-sub",
        },
      }
    );
    expect(mockDisableCognitoUser).toHaveBeenCalledWith("target@test.com");
  });

  it("clientAdmin can remove eventAdmin within their clients", async () => {
    mockRequireAuth.mockResolvedValue(clientAdminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({
      role: "eventAdmin",
      clientIds: ["client-1"],
    });
    mockFindOne.mockResolvedValueOnce(target);

    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: target._id },
      {
        $set: {
          isActive: false,
          updatedAt: expect.any(Date),
          updatedBy: "clientadmin-sub",
        },
      }
    );
    expect(mockDisableCognitoUser).toHaveBeenCalledWith("target@test.com");
  });

  // --- Cognito failure is non-blocking ---

  it("returns 200 even when Cognito disable fails", async () => {
    mockRequireAuth.mockResolvedValue(superadminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser();
    mockFindOne.mockResolvedValueOnce(target);
    mockDisableCognitoUser.mockRejectedValue(new Error("Cognito down"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // MongoDB should still have been updated
    expect(mockUpdateOne).toHaveBeenCalled();

    // Error logged but not propagated
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to disable Cognito user:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  // --- Edge case: target user has no clientIds ---

  it("clientAdmin can remove eventAdmin with empty clientIds array", async () => {
    mockRequireAuth.mockResolvedValue(clientAdminCaller());
    mockObjectIdIsValid.mockReturnValue(false);
    const target = makeTargetUser({
      role: "eventAdmin",
      clientIds: [], // empty means every() returns true
    });
    mockFindOne.mockResolvedValueOnce(target);

    const req = createRequest({ userId: "target-sub" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });
});
