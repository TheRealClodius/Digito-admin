import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/api-auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/mongodb-collections", () => ({
  getClientsCollection: vi.fn(),
  getClientEventsCollection: vi.fn(),
}));

import { GET } from "./route";
import * as apiAuth from "@/lib/api-auth";
import * as collections from "@/lib/mongodb-collections";

describe("GET /api/stats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(apiAuth.requireRole).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await GET(new Request("http://localhost/api/stats"));
    expect(res.status).toBe(401);
  });

  it("returns aggregate stats for superadmin", async () => {
    vi.mocked(apiAuth.requireRole).mockResolvedValue({ email: "admin@test.com" } as any);

    const mockClientsCol = { countDocuments: vi.fn().mockResolvedValue(5) };
    const mockEventsCol = {
      countDocuments: vi.fn()
        .mockResolvedValueOnce(12) // total events
        .mockResolvedValueOnce(4), // active events
    };

    vi.mocked(collections.getClientsCollection).mockResolvedValue(mockClientsCol as any);
    vi.mocked(collections.getClientEventsCollection).mockResolvedValue(mockEventsCol as any);

    const res = await GET(new Request("http://localhost/api/stats"));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({
      totalClients: 5,
      totalEvents: 12,
      activeEvents: 4,
    });
  });

  it("requires superadmin role", async () => {
    vi.mocked(apiAuth.requireRole).mockResolvedValue({ email: "admin@test.com" } as any);

    const mockCol = { countDocuments: vi.fn().mockResolvedValue(0) };
    vi.mocked(collections.getClientsCollection).mockResolvedValue(mockCol as any);
    vi.mocked(collections.getClientEventsCollection).mockResolvedValue(mockCol as any);

    await GET(new Request("http://localhost/api/stats"));

    expect(apiAuth.requireRole).toHaveBeenCalledWith(
      expect.any(Request),
      ["superadmin"]
    );
  });
});
