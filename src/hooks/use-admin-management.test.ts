import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock API client
const mockApiFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

import { useAdminManagement } from "./use-admin-management";
import { QueryWrapper } from "@/test/query-wrapper";

describe("useAdminManagement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApiFetch.mockResolvedValue([
      { id: "user-1", email: "admin1@test.com", role: "clientAdmin", clientIds: ["c1"] },
      { id: "user-2", email: "admin2@test.com", role: "eventAdmin", clientIds: ["c1"], eventCodes: ["e1"] },
    ]);
  });

  it("returns list of admins from API", async () => {
    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.admins).toHaveLength(2);
    expect(result.current.admins[0].email).toBe("admin1@test.com");
    expect(result.current.admins[1].email).toBe("admin2@test.com");
  });

  it("returns loading state", () => {
    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });
    expect(result.current.loading).toBe(true);
  });

  it("fetches from /api/admin/users", async () => {
    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/users");
  });

  it("addAdmin calls /api/set-user-role via apiFetch", async () => {
    mockApiFetch.mockResolvedValueOnce([]);  // initial fetch
    mockApiFetch.mockResolvedValueOnce({ success: true, userId: "new-user" }); // addAdmin
    mockApiFetch.mockResolvedValueOnce([]); // refetch after invalidation

    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addAdmin({
        email: "new@test.com",
        role: "eventAdmin",
        clientIds: ["c1"],
        eventCodes: ["e1"],
      });
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/set-user-role", {
      method: "POST",
      body: {
        email: "new@test.com",
        role: "eventAdmin",
        clientIds: ["c1"],
        eventCodes: ["e1"],
      },
    });
  });

  it("addAdmin throws on API error", async () => {
    mockApiFetch.mockResolvedValueOnce([]);  // initial fetch
    mockApiFetch.mockRejectedValueOnce(new Error("User not found")); // addAdmin fails

    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

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

  it("removeAdmin calls /api/remove-user-role via apiFetch", async () => {
    mockApiFetch.mockResolvedValueOnce([]);  // initial fetch
    mockApiFetch.mockResolvedValueOnce({ success: true }); // removeAdmin
    mockApiFetch.mockResolvedValueOnce([]); // refetch after invalidation

    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeAdmin("user-1");
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/remove-user-role", {
      method: "DELETE",
      body: { userId: "user-1" },
    });
  });

  it("removeAdmin throws on API error", async () => {
    mockApiFetch.mockResolvedValueOnce([]);  // initial fetch
    mockApiFetch.mockRejectedValueOnce(new Error("Cannot remove superadmin")); // removeAdmin fails

    const { result } = renderHook(() => useAdminManagement(), { wrapper: QueryWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.removeAdmin("sa-1");
      })
    ).rejects.toThrow("Cannot remove superadmin");
  });
});
