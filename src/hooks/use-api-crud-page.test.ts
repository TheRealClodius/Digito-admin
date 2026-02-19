import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useApiCrudPage } from "./use-api-crud-page";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { QueryWrapper, createTestQueryClient } from "@/test/query-wrapper";

const mockApiFetch = vi.mocked(apiFetch);

type TestEntity = { id: string; name: string };

describe("useApiCrudPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  function renderCrudHook(overrides = {}) {
    return renderHook(
      () =>
        useApiCrudPage<TestEntity>({
          apiPath: "/api/clients",
          queryKey: ["clients"],
          entityName: "client",
          ...overrides,
        }),
      { wrapper: QueryWrapper }
    );
  }

  it("fetches data on mount", async () => {
    mockApiFetch.mockResolvedValue([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);

    const { result } = renderCrudHook();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(2);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/clients");
  });

  it("handleNew opens sheet with null editingEntity", () => {
    const { result } = renderCrudHook();

    act(() => result.current.handleNew());

    expect(result.current.sheetOpen).toBe(true);
    expect(result.current.editingEntity).toBeNull();
    expect(result.current.submitStatus).toBe("idle");
  });

  it("handleEdit opens sheet with the entity", async () => {
    mockApiFetch.mockResolvedValue([{ id: "1", name: "A" }]);

    const { result } = renderCrudHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleEdit({ id: "1", name: "A" }));

    expect(result.current.sheetOpen).toBe(true);
    expect(result.current.editingEntity).toEqual({ id: "1", name: "A" });
  });

  it("handleSubmit creates a new entity via POST", async () => {
    mockApiFetch.mockResolvedValueOnce([]); // initial fetch
    mockApiFetch.mockResolvedValueOnce({ id: "new", name: "New" }); // POST
    mockApiFetch.mockResolvedValueOnce([{ id: "new", name: "New" }]); // refetch

    const { result } = renderCrudHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleNew());

    await act(async () => {
      await result.current.handleSubmit({ name: "New" });
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/clients", {
      method: "POST",
      body: { name: "New" },
    });
    expect(result.current.submitStatus).toBe("success");
  });

  it("handleSubmit updates existing entity via PUT", async () => {
    mockApiFetch.mockResolvedValueOnce([{ id: "1", name: "Old" }]); // initial
    mockApiFetch.mockResolvedValueOnce({ id: "1", name: "Updated" }); // PUT
    mockApiFetch.mockResolvedValueOnce([{ id: "1", name: "Updated" }]); // refetch

    const { result } = renderCrudHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleEdit({ id: "1", name: "Old" }));

    await act(async () => {
      await result.current.handleSubmit({ name: "Updated" });
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/clients/1", {
      method: "PUT",
      body: { name: "Updated" },
    });
    expect(result.current.submitStatus).toBe("success");
  });

  it("handleSubmit sets error status on failure", async () => {
    mockApiFetch.mockResolvedValueOnce([]); // initial
    mockApiFetch.mockRejectedValueOnce(new Error("Server error")); // POST fails

    const { result } = renderCrudHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleNew());

    await act(async () => {
      await result.current.handleSubmit({ name: "Fail" });
    });

    expect(result.current.submitStatus).toBe("error");
    expect(toast.error).toHaveBeenCalled();
  });

  it("handleDelete calls DELETE endpoint", async () => {
    mockApiFetch.mockResolvedValueOnce([{ id: "1", name: "A" }]); // initial
    mockApiFetch.mockResolvedValueOnce(null); // DELETE
    mockApiFetch.mockResolvedValueOnce([]); // refetch

    const { result } = renderCrudHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDeletingEntityId("1"));

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/clients/1", {
      method: "DELETE",
    });
    expect(toast.success).toHaveBeenCalled();
    expect(result.current.deletingEntityId).toBeNull();
  });

  it("handleDelete calls onCleanupFiles before deleting", async () => {
    const cleanupFn = vi.fn().mockResolvedValue(undefined);
    mockApiFetch.mockResolvedValueOnce([{ id: "1", name: "A" }]); // initial
    mockApiFetch.mockResolvedValueOnce(null); // DELETE
    mockApiFetch.mockResolvedValueOnce([]); // refetch

    const { result } = renderCrudHook({ onCleanupFiles: cleanupFn });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDeletingEntityId("1"));

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(cleanupFn).toHaveBeenCalledWith({ id: "1", name: "A" });
  });

  describe("optimistic updates", () => {
    it("optimistically updates cache on PUT and reverts on error", async () => {
      const queryClient = createTestQueryClient();
      mockApiFetch.mockResolvedValueOnce([{ id: "1", name: "Old" }]); // initial

      const { result } = renderHook(
        () =>
          useApiCrudPage<TestEntity>({
            apiPath: "/api/clients",
            queryKey: ["clients"],
            entityName: "client",
          }),
        {
          wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(QueryWrapper, { client: queryClient }, children),
        }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual([{ id: "1", name: "Old" }]);

      // Make PUT fail
      mockApiFetch.mockRejectedValueOnce(new Error("Server error"));

      act(() => result.current.handleEdit({ id: "1", name: "Old" }));

      await act(async () => {
        await result.current.handleSubmit({ name: "Updated" });
      });

      // Should have reverted — the error handler triggers invalidation
      expect(result.current.submitStatus).toBe("error");
    });

    it("rolls back cache on failed DELETE", async () => {
      mockApiFetch.mockResolvedValueOnce([
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ]); // initial fetch

      const { result } = renderCrudHook();
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toHaveLength(2);

      // Make DELETE fail
      mockApiFetch.mockRejectedValueOnce(new Error("Delete failed"));

      act(() => result.current.setDeletingEntityId("1"));

      await act(async () => {
        await result.current.handleDelete();
      });

      // After failure, verify error toast was called
      expect(toast.error).toHaveBeenCalled();

      // After rollback, data should be back to 2 items
      expect(result.current.data).toHaveLength(2);
    });
  });

  it("handleDelete uses custom onDelete when provided", async () => {
    const customDelete = vi.fn().mockResolvedValue(undefined);
    mockApiFetch.mockResolvedValueOnce([{ id: "1", name: "A" }]); // initial
    mockApiFetch.mockResolvedValueOnce([]); // refetch

    const { result } = renderCrudHook({ onDelete: customDelete });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDeletingEntityId("1"));

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(customDelete).toHaveBeenCalledWith("1");
    // Should NOT call the default DELETE endpoint
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      "/api/clients/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
