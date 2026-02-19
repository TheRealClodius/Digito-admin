import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { VerifiedCaller } from "@/lib/api-auth";
import type { AdminUser } from "@/types/admin-user";
import { ObjectId } from "mongodb";

// === Mocks ===

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockCreateCognitoUser = vi.fn();
const mockGenerateTemporaryPassword = vi.fn();
const mockEnableCognitoUser = vi.fn();
vi.mock("@/lib/cognito-admin", () => ({
  createCognitoUser: (...args: unknown[]) => mockCreateCognitoUser(...args),
  generateTemporaryPassword: (...args: unknown[]) =>
    mockGenerateTemporaryPassword(...args),
  enableCognitoUser: (...args: unknown[]) => mockEnableCognitoUser(...args),
}));

const mockUpdateOne = vi.fn();
const mockGetAdminUsersCollection = vi.fn();
vi.mock("@/lib/mongodb-collections", () => ({
  getAdminUsersCollection: (...args: unknown[]) =>
    mockGetAdminUsersCollection(...args),
}));

import { POST } from "./route";

// === Helpers ===

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/set-user-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSuperadminCaller(
  overrides?: Partial<VerifiedCaller>
): VerifiedCaller {
  return {
    sub: "superadmin-sub",
    email: "superadmin@test.com",
    role: "superadmin",
    isSuperAdmin: true,
    adminUser: {
      _id: new ObjectId(),
      cognitoSub: "superadmin-sub",
      email: "superadmin@test.com",
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

function makeClientAdminCaller(
  overrides?: Partial<VerifiedCaller>
): VerifiedCaller {
  return {
    sub: "clientadmin-sub",
    email: "clientadmin@test.com",
    role: "clientAdmin",
    isSuperAdmin: false,
    adminUser: {
      _id: new ObjectId(),
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
      createdBy: "superadmin-sub",
      updatedBy: "superadmin-sub",
    },
    ...overrides,
  };
}

function makeEventAdminCaller(): VerifiedCaller {
  return {
    sub: "eventadmin-sub",
    email: "eventadmin@test.com",
    role: "eventAdmin",
    isSuperAdmin: false,
    adminUser: {
      _id: new ObjectId(),
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
      createdBy: "clientadmin-sub",
      updatedBy: "clientadmin-sub",
    },
  };
}

// === Tests ===

describe("POST /api/set-user-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Cognito user creation succeeds
    mockGenerateTemporaryPassword.mockReturnValue("TempPass1!");
    mockCreateCognitoUser.mockResolvedValue({ cognitoSub: "new-cognito-sub" });

    // Default: MongoDB collection with updateOne
    mockUpdateOne.mockResolvedValue({
      upsertedId: new ObjectId(),
      matchedCount: 0,
      modifiedCount: 0,
    });
    mockGetAdminUsersCollection.mockResolvedValue({
      updateOne: mockUpdateOne,
    });
  });

  it("returns 401 without authorization header", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      )
    );
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      )
    );
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing email", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const req = createRequest({ role: "clientAdmin", clientIds: ["c1"] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 with missing role", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const req = createRequest({
      email: "target@test.com",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 with invalid role value", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const req = createRequest({
      email: "target@test.com",
      role: "superadmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 with missing clientIds", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when eventAdmin tries to set any role", async () => {
    mockRequireAuth.mockResolvedValue(makeEventAdminCaller());
    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["c1"],
      eventCodes: ["e1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when clientAdmin tries to set clientAdmin role", async () => {
    mockRequireAuth.mockResolvedValue(makeClientAdminCaller());
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when clientAdmin creates eventAdmin for unassigned client", async () => {
    mockRequireAuth.mockResolvedValue(makeClientAdminCaller());
    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["other-client"],
      eventCodes: ["e1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("succeeds when Cognito user already exists (UsernameExistsException)", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const usernameExistsError = new Error("User already exists");
    usernameExistsError.name = "UsernameExistsException";
    mockCreateCognitoUser.mockRejectedValue(usernameExistsError);
    mockEnableCognitoUser.mockResolvedValue(undefined);

    const upsertedId = new ObjectId();
    mockUpdateOne.mockResolvedValue({
      upsertedId,
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "existing@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Should still upsert in MongoDB
    expect(mockUpdateOne).toHaveBeenCalled();

    // The $set should NOT include cognitoSub since creation failed
    const updateCall = mockUpdateOne.mock.calls[0];
    const filter = updateCall[0];
    const update = updateCall[1];
    expect(filter).toEqual({ email: "existing@test.com" });
    expect(update.$set.cognitoSub).toBeUndefined();
  });

  it("calls enableCognitoUser when user already exists in Cognito", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const usernameExistsError = new Error("User already exists");
    usernameExistsError.name = "UsernameExistsException";
    mockCreateCognitoUser.mockRejectedValue(usernameExistsError);
    mockEnableCognitoUser.mockResolvedValue(undefined);

    mockUpdateOne.mockResolvedValue({
      upsertedId: null,
      matchedCount: 1,
      modifiedCount: 1,
    });

    const req = createRequest({
      email: "Existing@Test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should call enableCognitoUser with lowercase email
    expect(mockEnableCognitoUser).toHaveBeenCalledWith("existing@test.com");
  });

  it("succeeds even if enableCognitoUser fails (non-blocking)", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const usernameExistsError = new Error("User already exists");
    usernameExistsError.name = "UsernameExistsException";
    mockCreateCognitoUser.mockRejectedValue(usernameExistsError);
    mockEnableCognitoUser.mockRejectedValue(new Error("SES error"));

    mockUpdateOne.mockResolvedValue({
      upsertedId: null,
      matchedCount: 1,
      modifiedCount: 1,
    });

    const req = createRequest({
      email: "existing@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockEnableCognitoUser).toHaveBeenCalled();
  });

  it("returns 500 when Cognito creation fails with unexpected error", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    const unexpectedError = new Error("Network error");
    unexpectedError.name = "ServiceUnavailableException";
    mockCreateCognitoUser.mockRejectedValue(unexpectedError);

    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Failed to create user in authentication system");
  });

  it("superadmin can create clientAdmin", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    const upsertedId = new ObjectId();
    mockUpdateOne.mockResolvedValue({
      upsertedId,
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["client-1", "client-2"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify Cognito user was created
    expect(mockCreateCognitoUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "target@test.com",
        temporaryPassword: "TempPass1!",
      })
    );

    // Verify MongoDB upsert
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { email: "target@test.com" },
      expect.objectContaining({
        $set: expect.objectContaining({
          role: "clientAdmin",
          clientIds: ["client-1", "client-2"],
          isActive: true,
          cognitoSub: "new-cognito-sub",
          updatedBy: "superadmin-sub",
        }),
        $setOnInsert: expect.objectContaining({
          email: "target@test.com",
          language: "it",
          createdBy: "superadmin-sub",
        }),
      }),
      { upsert: true }
    );
  });

  it("superadmin can create eventAdmin", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    const upsertedId = new ObjectId();
    mockUpdateOne.mockResolvedValue({
      upsertedId,
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventCodes: ["event-1", "event-2"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify MongoDB upsert with eventCodes
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { email: "target@test.com" },
      expect.objectContaining({
        $set: expect.objectContaining({
          role: "eventAdmin",
          clientIds: ["client-1"],
          eventCodes: ["event-1", "event-2"],
        }),
      }),
      { upsert: true }
    );
  });

  it("clientAdmin can create eventAdmin for their clients", async () => {
    mockRequireAuth.mockResolvedValue(makeClientAdminCaller());

    const upsertedId = new ObjectId();
    mockUpdateOne.mockResolvedValue({
      upsertedId,
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventCodes: ["event-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify MongoDB upsert with correct createdBy
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { email: "target@test.com" },
      expect.objectContaining({
        $set: expect.objectContaining({
          role: "eventAdmin",
          updatedBy: "clientadmin-sub",
        }),
        $setOnInsert: expect.objectContaining({
          createdBy: "clientadmin-sub",
        }),
      }),
      { upsert: true }
    );
  });

  it("normalizes email to lowercase", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    mockUpdateOne.mockResolvedValue({
      upsertedId: new ObjectId(),
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "Target@Test.COM",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Cognito should receive lowercase email
    expect(mockCreateCognitoUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "target@test.com",
      })
    );

    // MongoDB filter and $setOnInsert should use lowercase email
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { email: "target@test.com" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          email: "target@test.com",
        }),
      }),
      { upsert: true }
    );
  });

  it("includes firstName and lastName when provided", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    mockUpdateOne.mockResolvedValue({
      upsertedId: new ObjectId(),
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
      firstName: "John",
      lastName: "Doe",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Cognito should receive name fields
    expect(mockCreateCognitoUser).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "John",
        lastName: "Doe",
      })
    );

    // MongoDB $set should include name fields
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
        }),
      }),
      expect.anything()
    );
  });

  it("returns upsertedId as userId for new documents", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    const upsertedId = new ObjectId();
    mockUpdateOne.mockResolvedValue({
      upsertedId,
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = createRequest({
      email: "new@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.userId).toBe(upsertedId.toString());
  });

  it("returns email as userId when updating existing document", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());

    // User already exists in Cognito
    const usernameExistsError = new Error("User already exists");
    usernameExistsError.name = "UsernameExistsException";
    mockCreateCognitoUser.mockRejectedValue(usernameExistsError);

    // No upsertedId means document was updated, not inserted
    mockUpdateOne.mockResolvedValue({
      upsertedId: null,
      matchedCount: 1,
      modifiedCount: 1,
    });

    const req = createRequest({
      email: "existing@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.userId).toBe("existing@test.com");
  });
});
