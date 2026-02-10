import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock dependencies
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "caller-uid", getIdToken: vi.fn().mockResolvedValue("mock-token") },
    loading: false,
  })),
}));

vi.mock("@/hooks/use-collection", () => ({
  useCollection: vi.fn(),
}));

import { useAdminManagement } from "./use-admin-management";
import * as collectionHook from "@/hooks/use-collection";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAdminManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [
        { id: "user-1", email: "admin1@test.com", role: "clientAdmin", clientIds: ["c1"] },
        { id: "user-2", email: "admin2@test.com", role: "eventAdmin", clientIds: ["c1"], eventIds: ["e1"] },
      ] as any,
      loading: false,
      error: null,
    });
  });

  it("returns list of admins from userPermissions collection", () => {
    const { result } = renderHook(() => useAdminManagement());

    expect(result.current.admins).toHaveLength(2);
    expect(result.current.admins[0].email).toBe("admin1@test.com");
    expect(result.current.admins[1].email).toBe("admin2@test.com");
  });

  it("returns loading state from useCollection", () => {
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    const { result } = renderHook(() => useAdminManagement());
    expect(result.current.loading).toBe(true);
  });

  it("addAdmin calls /api/set-user-role with correct body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, userId: "new-user" }),
    });

    const { result } = renderHook(() => useAdminManagement());

    await act(async () => {
      await result.current.addAdmin({
        email: "new@test.com",
        role: "eventAdmin",
        clientIds: ["c1"],
        eventIds: ["e1"],
      });
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/set-user-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mock-token",
      },
      body: JSON.stringify({
        email: "new@test.com",
        role: "eventAdmin",
        clientIds: ["c1"],
        eventIds: ["e1"],
      }),
    });
  });

  it("addAdmin throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "User not found" }),
    });

    const { result } = renderHook(() => useAdminManagement());

    await expect(
      act(async () => {
        await result.current.addAdmin({
          email: "bad@test.com",
          role: "clientAdmin",
          clientIds: ["c1"],
        });
      })
    ).rejects.toThrow("User not found");
  });

  it("removeAdmin calls /api/remove-user-role with correct body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useAdminManagement());

    await act(async () => {
      await result.current.removeAdmin("user-1");
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/remove-user-role", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mock-token",
      },
      body: JSON.stringify({ userId: "user-1" }),
    });
  });

  it("removeAdmin throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Cannot remove superadmin" }),
    });

    const { result } = renderHook(() => useAdminManagement());

    await expect(
      act(async () => {
        await result.current.removeAdmin("sa-1");
      })
    ).rejects.toThrow("Cannot remove superadmin");
  });

  it("reads from userPermissions collection with email ordering", () => {
    renderHook(() => useAdminManagement());

    expect(collectionHook.useCollection).toHaveBeenCalledWith({
      path: "userPermissions",
      orderByField: "email",
      orderDirection: "asc",
    });
  });
});
