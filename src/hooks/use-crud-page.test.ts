import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useCrudPage } from "./use-crud-page";
import * as firestore from "@/lib/firestore";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/lib/firestore", () => ({
  addDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./use-collection", () => ({
  useCollection: vi.fn(() => ({
    data: [],
    loading: false,
    error: null,
  })),
}));

describe("useCrudPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("state management", () => {
    it("initializes with correct default state", () => {
      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      expect(result.current.sheetOpen).toBe(false);
      expect(result.current.editingEntity).toBe(null);
      expect(result.current.deletingEntityId).toBe(null);
      expect(result.current.submitStatus).toBe("idle");
    });
  });

  describe("handleNew", () => {
    it("opens sheet and resets editing state", () => {
      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      act(() => {
        result.current.handleNew();
      });

      expect(result.current.sheetOpen).toBe(true);
      expect(result.current.editingEntity).toBe(null);
      expect(result.current.submitStatus).toBe("idle");
    });
  });

  describe("handleEdit", () => {
    it("opens sheet and sets editing entity", () => {
      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      const mockEntity = { id: "123", name: "Test" };

      act(() => {
        result.current.handleEdit(mockEntity);
      });

      expect(result.current.sheetOpen).toBe(true);
      expect(result.current.editingEntity).toEqual(mockEntity);
      expect(result.current.submitStatus).toBe("idle");
    });
  });

  describe("handleSubmit", () => {
    it("calls addDocument when creating new entity", async () => {
      const mockAddDocument = vi.mocked(firestore.addDocument);
      mockAddDocument.mockResolvedValue("new-id");

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      const data = { name: "New Entity" };

      await act(async () => {
        await result.current.handleSubmit(data);
      });

      expect(mockAddDocument).toHaveBeenCalledWith("test/collection", data);
      expect(result.current.submitStatus).toBe("success");
    });

    it("calls updateDocument when editing existing entity", async () => {
      const mockUpdateDocument = vi.mocked(firestore.updateDocument);
      mockUpdateDocument.mockResolvedValue();

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      const mockEntity = { id: "123", name: "Test" };
      const updatedData = { name: "Updated" };

      act(() => {
        result.current.handleEdit(mockEntity);
      });

      await act(async () => {
        await result.current.handleSubmit(updatedData);
      });

      expect(mockUpdateDocument).toHaveBeenCalledWith(
        "test/collection",
        "123",
        updatedData
      );
      expect(result.current.submitStatus).toBe("success");
    });

    it("handles errors and shows toast", async () => {
      const mockAddDocument = vi.mocked(firestore.addDocument);
      mockAddDocument.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
          entityName: "brand",
        })
      );

      await act(async () => {
        await result.current.handleSubmit({ name: "Test" });
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to save brand");
      expect(result.current.submitStatus).toBe("error");
    });

    it("does nothing if collectionPath is empty", async () => {
      const mockAddDocument = vi.mocked(firestore.addDocument);

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "",
        })
      );

      await act(async () => {
        await result.current.handleSubmit({ name: "Test" });
      });

      expect(mockAddDocument).not.toHaveBeenCalled();
    });

    it("applies data transformer if provided", async () => {
      const mockAddDocument = vi.mocked(firestore.addDocument);
      mockAddDocument.mockResolvedValue("new-id");

      const transformer = vi.fn((data) => ({
        ...data,
        transformed: true,
      }));

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
          dataTransformer: transformer,
        })
      );

      const data = { name: "Test" };

      await act(async () => {
        await result.current.handleSubmit(data);
      });

      expect(transformer).toHaveBeenCalledWith(data);
      expect(mockAddDocument).toHaveBeenCalledWith("test/collection", {
        name: "Test",
        transformed: true,
      });
    });
  });

  describe("handleDelete", () => {
    it("calls deleteDocument and shows success toast", async () => {
      const mockDeleteDocument = vi.mocked(firestore.deleteDocument);
      mockDeleteDocument.mockResolvedValue();

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
          entityName: "brand",
        })
      );

      act(() => {
        result.current.setDeletingEntityId("123");
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteDocument).toHaveBeenCalledWith("test/collection", "123");
      expect(toast.success).toHaveBeenCalledWith("Brand deleted");
      expect(result.current.deletingEntityId).toBe(null);
    });

    it("handles errors and shows toast", async () => {
      const mockDeleteDocument = vi.mocked(firestore.deleteDocument);
      mockDeleteDocument.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
          entityName: "brand",
        })
      );

      act(() => {
        result.current.setDeletingEntityId("123");
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to delete brand");
      expect(result.current.deletingEntityId).toBe(null);
    });

    it("does nothing if deletingEntityId is null", async () => {
      const mockDeleteDocument = vi.mocked(firestore.deleteDocument);

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });

    it("does nothing if collectionPath is empty", async () => {
      const mockDeleteDocument = vi.mocked(firestore.deleteDocument);

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "",
        })
      );

      act(() => {
        result.current.setDeletingEntityId("123");
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });

    it("uses custom onDelete when provided instead of deleteDocument", async () => {
      const mockDeleteDocument = vi.mocked(firestore.deleteDocument);
      const customDelete = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "clients",
          entityName: "client",
          onDelete: customDelete,
        })
      );

      act(() => {
        result.current.setDeletingEntityId("c1");
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(customDelete).toHaveBeenCalledWith("c1");
      expect(mockDeleteDocument).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Client deleted");
      expect(result.current.deletingEntityId).toBe(null);
    });
  });

  describe("setters", () => {
    it("provides setSheetOpen to control sheet state", () => {
      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      act(() => {
        result.current.setSheetOpen(true);
      });

      expect(result.current.sheetOpen).toBe(true);

      act(() => {
        result.current.setSheetOpen(false);
      });

      expect(result.current.sheetOpen).toBe(false);
    });

    it("provides setDeletingEntityId to control delete dialog", () => {
      const { result } = renderHook(() =>
        useCrudPage({
          collectionPath: "test/collection",
        })
      );

      act(() => {
        result.current.setDeletingEntityId("123");
      });

      expect(result.current.deletingEntityId).toBe("123");

      act(() => {
        result.current.setDeletingEntityId(null);
      });

      expect(result.current.deletingEntityId).toBe(null);
    });
  });
});
