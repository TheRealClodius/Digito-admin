import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
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
});
