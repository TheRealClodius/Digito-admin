import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

const mockCheckSuperAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({
  checkSuperAdmin: (...args: unknown[]) => mockCheckSuperAdmin(...args),
}));

import { useAdminCheck } from "./use-admin-check";
import type { User } from "firebase/auth";

function createMockUser(claims: Record<string, unknown> = {}): User {
  return {
    uid: "test-uid",
    getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
  } as unknown as User;
}

describe("useAdminCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loading true initially when user is provided", () => {
    mockCheckSuperAdmin.mockReturnValue(new Promise(() => {})); // never resolves
    const user = createMockUser({ admin: true });

    const { result } = renderHook(() => useAdminCheck(user));

    expect(result.current.loading).toBe(true);
    expect(result.current.isAdmin).toBeNull();
  });

  it("returns isAdmin true for admin user", async () => {
    mockCheckSuperAdmin.mockResolvedValue(true);
    const user = createMockUser({ admin: true });

    const { result } = renderHook(() => useAdminCheck(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(mockCheckSuperAdmin).toHaveBeenCalledWith(user);
  });

  it("returns isAdmin false for non-admin user", async () => {
    mockCheckSuperAdmin.mockResolvedValue(false);
    const user = createMockUser({});

    const { result } = renderHook(() => useAdminCheck(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it("returns isAdmin null and loading false when user is null", async () => {
    const { result } = renderHook(() => useAdminCheck(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBeNull();
    expect(mockCheckSuperAdmin).not.toHaveBeenCalled();
  });

  it("handles errors by setting isAdmin to false", async () => {
    mockCheckSuperAdmin.mockRejectedValue(new Error("network error"));
    const user = createMockUser();

    const { result } = renderHook(() => useAdminCheck(user));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });
});
