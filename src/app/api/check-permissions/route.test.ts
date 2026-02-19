import { describe, it, expect, vi, beforeEach } from "vitest";

// === Cognito verifier mock ===
const mockVerifyCognitoToken = vi.fn();
vi.mock("@/lib/cognito", () => ({
  verifyCognitoToken: (...args: unknown[]) => mockVerifyCognitoToken(...args),
}));

// === Cognito Admin mock (for AdminGetUser when username is not an email) ===
const mockAdminSend = vi.fn();
vi.mock("@/lib/cognito-admin", () => ({
  getCognitoAdminClient: vi.fn(function () {
    return { send: mockAdminSend };
  }),
  getUserPoolId: vi.fn(() => "eu-south-1_testpool"),
}));

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  AdminGetUserCommand: vi.fn(function (input: unknown) {
    return input;
  }),
}));

// === MongoDB mock ===
type DocData = Record<string, unknown>;

const mockMongoState = {
  userBySub: null as DocData | null,
  userByEmail: null as DocData | null,
  shouldThrow: false,
};

vi.mock("@/lib/mongodb-collections", () => ({
  getAdminUsersCollection: async () => ({
    findOne: async (query: Record<string, unknown>) => {
      if (mockMongoState.shouldThrow) throw new Error("MongoDB unavailable");
      if (query.cognitoSub) return mockMongoState.userBySub;
      if (query.email) return mockMongoState.userByEmail;
      return null;
    },
  }),
}));

import { GET } from "./route";

function createRequest(token: string | null = "valid-token") {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/check-permissions", {
    method: "GET",
    headers,
  });
}

const baseCognitoPayload = {
  sub: "user-sub-123",
  username: "user@test.com",
  token_use: "access" as const,
  client_id: "test-client",
  iss: "https://cognito-idp.eu-south-1.amazonaws.com/pool",
  exp: 9999999999,
  iat: 1000000000,
  jti: "jti",
  origin_jti: "origin-jti",
  scope: "",
  auth_time: 1000000000,
};

describe("GET /api/check-permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMongoState.userBySub = null;
    mockMongoState.userByEmail = null;
    mockMongoState.shouldThrow = false;
    // Default: AdminGetUser returns no email (won't be called in most tests)
    mockAdminSend.mockResolvedValue({ UserAttributes: [] });
  });

  it("returns 401 without authorization header", async () => {
    const res = await GET(createRequest(null));
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockVerifyCognitoToken.mockRejectedValue(new Error("Invalid token"));
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns superadmin role when found by cognitoSub", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      sub: "super-sub",
    });
    mockMongoState.userBySub = {
      cognitoSub: "super-sub",
      email: "super@test.com",
      role: "superadmin",
      clientIds: null,
      eventCodes: null,
      isActive: true,
    };
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("superadmin");
  });

  it("returns clientAdmin role with permissions when found by cognitoSub", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      sub: "client-sub",
    });
    mockMongoState.userBySub = {
      cognitoSub: "client-sub",
      email: "client@test.com",
      role: "clientAdmin",
      clientIds: ["c1", "c2"],
      eventCodes: null,
      isActive: true,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("clientAdmin");
    expect(body.permissions.clientIds).toEqual(["c1", "c2"]);
  });

  it("falls back to email lookup when user not found by cognitoSub", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      sub: "new-sub",
      username: "user@test.com",
    });
    mockMongoState.userBySub = null;
    mockMongoState.userByEmail = {
      cognitoSub: "old-sub",
      email: "user@test.com",
      role: "eventAdmin",
      clientIds: ["c1"],
      eventCodes: ["2025089"],
      isActive: true,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("eventAdmin");
    expect(body.permissions.eventCodes).toEqual(["2025089"]);
  });

  it("uses lowercase email for lookup when username is mixed-case", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      sub: "new-sub",
      username: "User@Test.COM",
    });
    mockMongoState.userBySub = null;
    mockMongoState.userByEmail = {
      cognitoSub: "old-sub",
      email: "user@test.com",
      role: "superadmin",
      clientIds: null,
      eventCodes: null,
      isActive: true,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("superadmin");
  });

  it("returns null role when user not found anywhere", async () => {
    mockVerifyCognitoToken.mockResolvedValue(baseCognitoPayload);
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBeNull();
    expect(body.permissions).toBeNull();
  });

  it("returns null role when user is inactive", async () => {
    mockVerifyCognitoToken.mockResolvedValue(baseCognitoPayload);
    mockMongoState.userBySub = {
      cognitoSub: "user-sub-123",
      email: "user@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
      eventCodes: null,
      isActive: false,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBeNull();
  });

  it("returns 500 when MongoDB is unavailable", async () => {
    mockVerifyCognitoToken.mockResolvedValue(baseCognitoPayload);
    mockMongoState.shouldThrow = true;
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("fetches email from Cognito when username is a UUID (not an email)", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      sub: "uuid-sub-123",
      username: "uuid-sub-123", // UUID, not an email address
    });
    mockAdminSend.mockResolvedValue({
      UserAttributes: [{ Name: "email", Value: "user@test.com" }],
    });
    mockMongoState.userBySub = null;
    mockMongoState.userByEmail = {
      cognitoSub: "old-sub",
      email: "user@test.com",
      role: "superadmin",
      clientIds: null,
      eventCodes: null,
      isActive: true,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("superadmin");
  });

  it("returns null role when username is UUID and Cognito fetch fails", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      sub: "uuid-sub-123",
      username: "uuid-sub-123",
    });
    mockAdminSend.mockRejectedValue(new Error("UserNotFoundException"));
    mockMongoState.userBySub = null;
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBeNull();
  });

  it("does not call AdminGetUser when username is already an email", async () => {
    mockVerifyCognitoToken.mockResolvedValue({
      ...baseCognitoPayload,
      username: "user@test.com",
    });
    mockMongoState.userBySub = {
      cognitoSub: "user-sub-123",
      email: "user@test.com",
      role: "eventAdmin",
      clientIds: null,
      eventCodes: null,
      isActive: true,
    };
    await GET(createRequest());
    expect(mockAdminSend).not.toHaveBeenCalled();
  });
});
