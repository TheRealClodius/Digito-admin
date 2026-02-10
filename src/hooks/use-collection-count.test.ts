import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCollectionCount } from "./use-collection-count";
import * as firestore from "firebase/firestore";

const { mockOnAuthStateChanged } = vi.hoisted(() => {
  const mockOnAuthStateChanged = vi.fn(
    (_auth: unknown, callback: (user: unknown) => void) => {
      callback({ uid: "test-user" });
      return vi.fn();
    }
  );
  return { mockOnAuthStateChanged };
});

// Mock firebase/firestore
vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    collection: vi.fn(),
    getCountFromServer: vi.fn(),
  };
});

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: mockOnAuthStateChanged,
}));

vi.mock("@/lib/firebase", () => ({
  getDbInstance: vi.fn(() => ({})),
  getAuthInstance: vi.fn(() => ({})),
}));

describe("useCollectionCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        callback({ uid: "test-user" });
        return vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns count 0 and loading true initially", () => {
    const mockCollectionRef = {};
    vi.mocked(firestore.collection).mockReturnValue(mockCollectionRef as any);
    vi.mocked(firestore.getCountFromServer).mockReturnValue(
      new Promise(() => {}) as any
    );

    const { result } = renderHook(() => useCollectionCount({ path: "clients" }));

    expect(result.current.count).toBe(0);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("returns the count from the server", async () => {
    const mockCollectionRef = {};
    const mockSnapshot = {
      data: () => ({ count: 5 }),
    };

    vi.mocked(firestore.collection).mockReturnValue(mockCollectionRef as any);
    vi.mocked(firestore.getCountFromServer).mockResolvedValue(mockSnapshot as any);

    const { result } = renderHook(() => useCollectionCount({ path: "clients" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it("handles empty collections", async () => {
    const mockCollectionRef = {};
    const mockSnapshot = {
      data: () => ({ count: 0 }),
    };

    vi.mocked(firestore.collection).mockReturnValue(mockCollectionRef as any);
    vi.mocked(firestore.getCountFromServer).mockResolvedValue(mockSnapshot as any);

    const { result } = renderHook(() => useCollectionCount({ path: "clients/123/brands" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when path is empty", () => {
    const { result } = renderHook(() => useCollectionCount({ path: "" }));

    expect(result.current.count).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(firestore.getCountFromServer).not.toHaveBeenCalled();
  });

  it("handles errors gracefully", async () => {
    const mockCollectionRef = {};
    const mockError = new Error("Firestore error");

    vi.mocked(firestore.collection).mockReturnValue(mockCollectionRef as any);
    vi.mocked(firestore.getCountFromServer).mockRejectedValue(mockError);

    const { result } = renderHook(() => useCollectionCount({ path: "clients" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe(mockError);
  });

  it("refetches when path changes", async () => {
    const mockCollectionRef1 = { path: "path1" };
    const mockCollectionRef2 = { path: "path2" };
    const mockSnapshot1 = { data: () => ({ count: 3 }) };
    const mockSnapshot2 = { data: () => ({ count: 7 }) };

    vi.mocked(firestore.collection)
      .mockReturnValueOnce(mockCollectionRef1 as any)
      .mockReturnValueOnce(mockCollectionRef2 as any);
    vi.mocked(firestore.getCountFromServer)
      .mockResolvedValueOnce(mockSnapshot1 as any)
      .mockResolvedValueOnce(mockSnapshot2 as any);

    const { result, rerender } = renderHook(
      ({ path }) => useCollectionCount({ path }),
      { initialProps: { path: "clients" } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(3);

    // Change path
    rerender({ path: "events" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.count).toBe(7);
    expect(firestore.getCountFromServer).toHaveBeenCalledTimes(2);
  });

  describe("auth gating", () => {
    it("does not query until Firebase Auth is ready", async () => {
      let authCallback: (user: unknown) => void;
      mockOnAuthStateChanged.mockImplementationOnce(
        (_auth: unknown, callback: (user: unknown) => void) => {
          authCallback = callback;
          return vi.fn();
        }
      );

      const mockCollectionRef = {};
      const mockSnapshot = { data: () => ({ count: 5 }) };
      vi.mocked(firestore.collection).mockReturnValue(
        mockCollectionRef as any
      );
      vi.mocked(firestore.getCountFromServer).mockResolvedValue(
        mockSnapshot as any
      );

      const { result } = renderHook(() =>
        useCollectionCount({ path: "clients" })
      );

      // Before auth fires, no query should be made
      expect(firestore.getCountFromServer).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);

      // Simulate auth ready
      authCallback!({ uid: "user-1" });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(firestore.getCountFromServer).toHaveBeenCalledTimes(1);
      expect(result.current.count).toBe(5);
    });

    it("does not query when user signs out", () => {
      mockOnAuthStateChanged.mockImplementationOnce(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(null);
          return vi.fn();
        }
      );

      const { result } = renderHook(() =>
        useCollectionCount({ path: "clients" })
      );

      expect(firestore.getCountFromServer).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });

    it("still returns zero count for empty path even without auth", () => {
      mockOnAuthStateChanged.mockImplementationOnce(
        (_auth: unknown, _callback: (user: unknown) => void) => {
          // Auth never fires
          return vi.fn();
        }
      );

      const { result } = renderHook(() =>
        useCollectionCount({ path: "" })
      );

      expect(result.current.count).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
