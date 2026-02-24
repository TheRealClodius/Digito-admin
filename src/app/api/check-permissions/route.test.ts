import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// === api-auth mocks ===
const mockResolveTokenIdentity = vi.fn();
const mockFindAdminUser = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  resolveTokenIdentity: (...args: unknown[]) => mockResolveTokenIdentity(...args),
  findAdminUser: (...args: unknown[]) => mockFindAdminUser(...args),
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

describe("GET /api/check-permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without authorization header", async () => {
    mockResolveTokenIdentity.mockResolvedValue(
      NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    );
    const res = await GET(createRequest(null));
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockResolveTokenIdentity.mockResolvedValue(
      NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    );
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns superadmin role when found by cognitoSub", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "super-sub", email: "super@test.com" });
    mockFindAdminUser.mockResolvedValue({
      cognitoSub: "super-sub",
      email: "super@test.com",
      role: "superadmin",
      clientIds: null,
      eventCodes: null,
      isActive: true,
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("superadmin");
  });

  it("returns clientAdmin role with permissions", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "client-sub", email: "client@test.com" });
    mockFindAdminUser.mockResolvedValue({
      cognitoSub: "client-sub",
      email: "client@test.com",
      role: "clientAdmin",
      clientIds: ["c1", "c2"],
      eventCodes: null,
      isActive: true,
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("clientAdmin");
    expect(body.permissions.clientIds).toEqual(["c1", "c2"]);
  });

  it("returns null role when user not found anywhere", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "unknown-sub", email: "unknown@test.com" });
    mockFindAdminUser.mockResolvedValue(null);

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBeNull();
    expect(body.permissions).toBeNull();
  });

  it("returns null role when user is inactive", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "user-sub", email: "user@test.com" });
    mockFindAdminUser.mockResolvedValue({
      cognitoSub: "user-sub",
      email: "user@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
      eventCodes: null,
      isActive: false,
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBeNull();
  });

  it("returns 500 when database is unavailable", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "user-sub", email: "user@test.com" });
    mockFindAdminUser.mockRejectedValue(new Error("MongoDB unavailable"));

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Database operation failed");
  });

  it("does not leak error details in responses", async () => {
    mockResolveTokenIdentity.mockResolvedValue(
      NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    );
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.detail).toBeUndefined();
  });

  it("calls findAdminUser with correct sub and email", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "test-sub", email: "test@test.com" });
    mockFindAdminUser.mockResolvedValue(null);

    await GET(createRequest());

    expect(mockFindAdminUser).toHaveBeenCalledWith("test-sub", "test@test.com");
  });

  it("returns eventAdmin role with eventCodes", async () => {
    mockResolveTokenIdentity.mockResolvedValue({ sub: "event-sub", email: "event@test.com" });
    mockFindAdminUser.mockResolvedValue({
      cognitoSub: "event-sub",
      email: "event@test.com",
      role: "eventAdmin",
      clientIds: ["c1"],
      eventCodes: ["2025089"],
      isActive: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      createdBy: "admin",
      updatedBy: "admin",
    });

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("eventAdmin");
    expect(body.permissions.eventCodes).toEqual(["2025089"]);
  });
});
