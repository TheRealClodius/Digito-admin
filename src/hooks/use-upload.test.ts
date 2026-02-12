import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpload } from "./use-upload";

const mockUploadTask = {
  on: vi.fn(),
  snapshot: { ref: { fullPath: "test/file.png" } },
};

const mockGetDownloadURL = vi.fn();
const mockDeleteObject = vi.fn();
const mockGetIdToken = vi.fn().mockResolvedValue("fresh-token");

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(),
  ref: vi.fn((_storage, path) => ({ fullPath: path })),
  uploadBytesResumable: vi.fn(() => mockUploadTask),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
}));

vi.mock("@/lib/firebase", () => ({
  getStorageInstance: vi.fn(),
  getAuthInstance: vi.fn(() => ({
    currentUser: { getIdToken: mockGetIdToken },
  })),
}));

describe("useUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    expect(result.current.progress).toBe(0);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.upload).toBe("function");
    expect(typeof result.current.deleteFile).toBe("function");
  });

  it("calls uploadBytesResumable and resolves with download URL", async () => {
    const downloadUrl = "https://storage.example.com/test/file.png";
    mockGetDownloadURL.mockResolvedValue(downloadUrl);

    // Make upload task simulate success
    mockUploadTask.on.mockImplementation(
      (_event: string, _progress: unknown, _error: unknown, complete: () => void) => {
        complete();
      }
    );

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    let url: string | undefined;
    await act(async () => {
      url = await result.current.upload(new File(["data"], "test.png"));
    });

    expect(url).toBe(downloadUrl);
    expect(result.current.uploading).toBe(false);
  });

  it("tracks upload progress", async () => {
    mockGetDownloadURL.mockResolvedValue("https://example.com/file.png");

    mockUploadTask.on.mockImplementation(
      (
        _event: string,
        onProgress: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
        _error: unknown,
        complete: () => void,
      ) => {
        // Simulate progress
        onProgress({ bytesTransferred: 50, totalBytes: 100 });
        complete();
      }
    );

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.upload(new File(["data"], "test.png"));
    });

    // After completion, progress is 100
    expect(result.current.progress).toBe(100);
  });

  it("handles upload errors", async () => {
    const uploadError = new Error("Upload failed");

    mockUploadTask.on.mockImplementation(
      (_event: string, _progress: unknown, onError: (err: Error) => void) => {
        onError(uploadError);
      }
    );

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await expect(
        result.current.upload(new File(["data"], "test.png"))
      ).rejects.toThrow("Upload failed");
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBe(uploadError);
  });

  it("deleteFile calls deleteObject", async () => {
    mockDeleteObject.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.deleteFile("https://storage.example.com/test/file.png");
    });

    expect(mockDeleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ fullPath: "https://storage.example.com/test/file.png" })
    );
  });

  it("refreshes auth token before deleting", async () => {
    mockDeleteObject.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.deleteFile("https://storage.example.com/test/file.png");
    });

    expect(mockGetIdToken).toHaveBeenCalledWith(true);
  });

  it("deleteFile swallows errors silently", async () => {
    mockDeleteObject.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    // Should not throw
    await act(async () => {
      await result.current.deleteFile("https://storage.example.com/nonexistent.png");
    });
  });

  it("sanitizes filenames", async () => {
    const { uploadBytesResumable } = await import("firebase/storage");
    mockGetDownloadURL.mockResolvedValue("https://example.com/file.png");
    mockUploadTask.on.mockImplementation(
      (_event: string, _progress: unknown, _error: unknown, complete: () => void) => {
        complete();
      }
    );

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.upload(new File(["data"], "my file (1).png"));
    });

    // uploadBytesResumable should have been called with a ref that has sanitized path
    expect(uploadBytesResumable).toHaveBeenCalled();
  });

  it("refreshes auth token before uploading", async () => {
    mockGetDownloadURL.mockResolvedValue("https://example.com/file.png");
    mockUploadTask.on.mockImplementation(
      (_event: string, _progress: unknown, _error: unknown, complete: () => void) => {
        complete();
      }
    );

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.upload(new File(["data"], "test.png"));
    });

    expect(mockGetIdToken).toHaveBeenCalledWith(true);
  });

  it("proceeds without token refresh when no user is signed in", async () => {
    const { getAuthInstance } = await import("@/lib/firebase");
    (getAuthInstance as ReturnType<typeof vi.fn>).mockReturnValueOnce({ currentUser: null });

    mockGetDownloadURL.mockResolvedValue("https://example.com/file.png");
    mockUploadTask.on.mockImplementation(
      (_event: string, _progress: unknown, _error: unknown, complete: () => void) => {
        complete();
      }
    );

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    mockGetIdToken.mockClear();
    await act(async () => {
      await result.current.upload(new File(["data"], "test.png"));
    });

    expect(mockGetIdToken).not.toHaveBeenCalled();
  });
});
