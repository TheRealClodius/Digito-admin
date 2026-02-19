import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockClientEventsCollection = {
  find: vi.fn(),
};
vi.mock("@/lib/mongodb-collections", () => ({
  getClientEventsCollection: () => Promise.resolve(mockClientEventsCollection),
}));

import { GET } from "./route";

function createRequest() {
  return new Request("http://localhost/api/events/next-code", {
    headers: { Authorization: "Bearer token" },
  });
}

function makeSuperadminCaller() {
  return {
    sub: "sub-123",
    email: "admin@test.com",
    role: "superadmin" as const,
    isSuperAdmin: true,
    adminUser: { role: "superadmin" },
  };
}

describe("GET /api/events/next-code", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns next eventCode when no events exist for current year", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    const year = new Date().getFullYear();
    expect(json.nextEventCode).toBe(`${year}001`);
  });

  it("increments from the highest eventCode for the current year", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    mockClientEventsCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { eventCode: "2026005" },
          ]),
        }),
      }),
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.nextEventCode).toBe("2026006");
  });

  it("ignores eventCodes from other years", async () => {
    mockRequireAuth.mockResolvedValue(makeSuperadminCaller());
    // No events matching current year prefix
    mockClientEventsCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await GET(createRequest());
    const json = await res.json();
    const year = new Date().getFullYear();
    expect(json.nextEventCode).toBe(`${year}001`);
  });
});
