import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollection } from "./use-collection";

const { mockUnsubscribe, mockOnSnapshot } = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn();
  const mockOnSnapshot = vi.fn(() => mockUnsubscribe);
  return { mockUnsubscribe, mockOnSnapshot };
});

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({ _mockDb: true })),
  collection: vi.fn((db, path) => ({ _path: path })),
  query: vi.fn((...args) => ({ _query: true, args })),
  orderBy: vi.fn((field, dir) => ({ _orderBy: field, _dir: dir })),
  limit: vi.fn((n) => ({ _limit: n })),
  onSnapshot: mockOnSnapshot,
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(),
}));

describe("useCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to Firestore on mount with path", () => {
    renderHook(() =>
      useCollection({ path: "clients", orderByField: "name", orderDirection: "asc" })
    );

    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe when path is empty", () => {
    const { result } = renderHook(() =>
      useCollection({ path: "", orderByField: "name", orderDirection: "asc" })
    );

    expect(mockOnSnapshot).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useCollection({ path: "clients", orderByField: "name", orderDirection: "asc" })
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("applies limit when pageSize is provided", async () => {
    const { limit } = await import("firebase/firestore");

    renderHook(() =>
      useCollection({ path: "clients", orderByField: "name", orderDirection: "asc", pageSize: 25 })
    );

    expect(limit).toHaveBeenCalledWith(25);
  });

  it("does not apply limit when pageSize is not provided", async () => {
    const { limit } = await import("firebase/firestore");

    renderHook(() =>
      useCollection({ path: "clients", orderByField: "name", orderDirection: "asc" })
    );

    expect(limit).not.toHaveBeenCalled();
  });

  it("uses constraintsKey instead of JSON.stringify for dependency tracking", () => {
    const constraints = [{ _where: true }] as any;

    const { rerender } = renderHook(
      ({ key }) =>
        useCollection({
          path: "clients",
          orderByField: "name",
          orderDirection: "asc",
          constraints,
          constraintsKey: key,
        }),
      { initialProps: { key: "v1" } }
    );

    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    // Re-render with same key — should NOT re-subscribe
    rerender({ key: "v1" });
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    // Re-render with different key — should re-subscribe
    rerender({ key: "v2" });
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });

  it("resets loading to true when path changes from empty to valid", () => {
    const { result, rerender } = renderHook(
      ({ path }) =>
        useCollection({ path, orderByField: "name", orderDirection: "asc" }),
      { initialProps: { path: "" } }
    );

    // Empty path → loading should be false
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);

    // Change to valid path → loading should reset to true
    rerender({ path: "clients/c1/events/e1/stands" });
    expect(result.current.loading).toBe(true);
  });

  it("clears error when path changes", () => {
    // First, set up a hook with a valid path that will trigger onSnapshot
    const { result, rerender } = renderHook(
      ({ path }) =>
        useCollection({ path, orderByField: "name", orderDirection: "asc" }),
      { initialProps: { path: "clients" } }
    );

    // Simulate an error by calling the onSnapshot error callback
    const errorCallback = mockOnSnapshot.mock.calls[0][2];
    act(() => {
      errorCallback(new Error("Missing or insufficient permissions."));
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe("Missing or insufficient permissions.");

    // Change path → error should be cleared
    rerender({ path: "clients/c1/events/e1/participants" });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it("updates data when onSnapshot succeeds", () => {
    const { result } = renderHook(() =>
      useCollection({ path: "clients", orderByField: "name", orderDirection: "asc" })
    );

    expect(result.current.loading).toBe(true);

    // Simulate successful snapshot
    const successCallback = mockOnSnapshot.mock.calls[0][1];
    act(() => {
      successCallback({
        docs: [
          { id: "doc1", data: () => ({ name: "Test" }) },
          { id: "doc2", data: () => ({ name: "Test 2" }) },
        ],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([
      { id: "doc1", name: "Test" },
      { id: "doc2", name: "Test 2" },
    ]);
    expect(result.current.error).toBeNull();
  });

  it("sets error when onSnapshot fails", () => {
    const { result } = renderHook(() =>
      useCollection({ path: "clients", orderByField: "name", orderDirection: "asc" })
    );

    // Simulate error
    const errorCallback = mockOnSnapshot.mock.calls[0][2];
    act(() => {
      errorCallback(new Error("permission-denied"));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error?.message).toBe("permission-denied");
    expect(result.current.data).toEqual([]);
  });

  it("clears error state when empty path follows an error", () => {
    const { result, rerender } = renderHook(
      ({ path }) =>
        useCollection({ path, orderByField: "name", orderDirection: "asc" }),
      { initialProps: { path: "clients" } }
    );

    // Simulate error
    const errorCallback = mockOnSnapshot.mock.calls[0][2];
    act(() => {
      errorCallback(new Error("network error"));
    });

    expect(result.current.error).not.toBeNull();

    // Switch to empty path → error should clear
    rerender({ path: "" });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it("resets loading to true when path changes from valid to valid", () => {
    const { result, rerender } = renderHook(
      ({ path }) => useCollection({ path, orderByField: "name", orderDirection: "asc" }),
      { initialProps: { path: "clients" } }
    );

    // Simulate successful data load
    const successCallback = mockOnSnapshot.mock.calls[0][1];

    act(() => {
      successCallback({ docs: [] });
    });

    // Loading should be false after data loads
    expect(result.current.loading).toBe(false);

    // Change path
    act(() => {
      rerender({ path: "events" });
    });

    // Loading should reset to true
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("clears error when path changes from one valid path to another", () => {
    const { result, rerender } = renderHook(
      ({ path }) => useCollection({ path, orderByField: "name", orderDirection: "asc" }),
      { initialProps: { path: "clients" } }
    );

    // Simulate an error on first path
    const errorCallback = mockOnSnapshot.mock.calls[0][2];
    const testError = new Error("Permission denied");

    act(() => {
      errorCallback(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.loading).toBe(false);

    // Change to different valid path
    act(() => {
      rerender({ path: "events" });
    });

    // Error should be cleared, loading should restart
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
