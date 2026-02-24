import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpload } from "./use-upload";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// Mock XMLHttpRequest for upload progress tracking
let mockXhrInstance: {
  open: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  upload: { onprogress: ((e: { loaded: number; total: number }) => void) | null };
  onload: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  status: number;
};

beforeEach(() => {
  mockXhrInstance = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    upload: { onprogress: null },
    onload: null,
    onerror: null,
    status: 200,
  };

  vi.stubGlobal("XMLHttpRequest", class {
    open = mockXhrInstance.open;
    send = mockXhrInstance.send;
    setRequestHeader = mockXhrInstance.setRequestHeader;
    upload = mockXhrInstance.upload;
    get onload() { return mockXhrInstance.onload; }
    set onload(fn) { mockXhrInstance.onload = fn; }
    get onerror() { return mockXhrInstance.onerror; }
    set onerror(fn) { mockXhrInstance.onerror = fn; }
    get status() { return mockXhrInstance.status; }
    set status(v) { mockXhrInstance.status = v; }
  });
});

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

  it("uploads file via presigned URL and returns public URL", async () => {
    const publicUrl = "https://pub-test.r2.dev/test/path/123-file.png";
    mockApiFetch.mockResolvedValue({
      presignedUrl: "https://presigned.example.com/upload",
      publicUrl,
      key: "test/path/123-file.png",
    });

    // Simulate successful XHR upload
    mockXhrInstance.send.mockImplementation(() => {
      mockXhrInstance.status = 200;
      mockXhrInstance.onload?.();
    });

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    let url: string | undefined;
    await act(async () => {
      url = await result.current.upload(new File(["data"], "test.png"));
    });

    expect(url).toBe(publicUrl);
    expect(result.current.uploading).toBe(false);

    // Verify apiFetch was called with correct params
    expect(mockApiFetch).toHaveBeenCalledWith("/api/upload", {
      method: "POST",
      body: {
        filename: "test.png",
        contentType: "",
        basePath: "test/path",
      },
    });
  });

  it("tracks upload progress", async () => {
    mockApiFetch.mockResolvedValue({
      presignedUrl: "https://presigned.example.com/upload",
      publicUrl: "https://pub-test.r2.dev/file.png",
      key: "file.png",
    });

    mockXhrInstance.send.mockImplementation(() => {
      // Simulate progress
      mockXhrInstance.upload.onprogress?.({ loaded: 50, total: 100 });
      mockXhrInstance.status = 200;
      mockXhrInstance.onload?.();
    });

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.upload(new File(["data"], "test.png"));
    });

    // After completion, progress is 100
    expect(result.current.progress).toBe(100);
  });

  it("handles upload errors from XHR", async () => {
    mockApiFetch.mockResolvedValue({
      presignedUrl: "https://presigned.example.com/upload",
      publicUrl: "https://pub-test.r2.dev/file.png",
      key: "file.png",
    });

    mockXhrInstance.send.mockImplementation(() => {
      mockXhrInstance.onerror?.(new Error("Network error"));
    });

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await expect(
        result.current.upload(new File(["data"], "test.png"))
      ).rejects.toThrow("Upload failed");
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it("handles presigned URL request failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await expect(
        result.current.upload(new File(["data"], "test.png"))
      ).rejects.toThrow("API error");
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error?.message).toBe("API error");
  });

  it("deleteFile calls DELETE API", async () => {
    mockApiFetch.mockResolvedValue(null);

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.deleteFile("https://pub-test.r2.dev/test/path/123-file.png");
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/upload?key="),
      { method: "DELETE" }
    );
  });

  it("deleteFile swallows errors silently", async () => {
    mockApiFetch.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    // Should not throw
    await act(async () => {
      await result.current.deleteFile("https://pub-test.r2.dev/nonexistent.png");
    });
  });

  it("uses custom filename when provided", async () => {
    mockApiFetch.mockResolvedValue({
      presignedUrl: "https://presigned.example.com/upload",
      publicUrl: "https://pub-test.r2.dev/file.png",
      key: "file.png",
    });

    mockXhrInstance.send.mockImplementation(() => {
      mockXhrInstance.status = 200;
      mockXhrInstance.onload?.();
    });

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await result.current.upload(new File(["data"], "original.png"), "custom-name.png");
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/upload", {
      method: "POST",
      body: expect.objectContaining({
        filename: "custom-name.png",
      }),
    });
  });

  it("handles non-200 XHR status as error", async () => {
    mockApiFetch.mockResolvedValue({
      presignedUrl: "https://presigned.example.com/upload",
      publicUrl: "https://pub-test.r2.dev/file.png",
      key: "file.png",
    });

    mockXhrInstance.send.mockImplementation(() => {
      mockXhrInstance.status = 403;
      mockXhrInstance.onload?.();
    });

    const { result } = renderHook(() => useUpload({ basePath: "test/path" }));

    await act(async () => {
      await expect(
        result.current.upload(new File(["data"], "test.png"))
      ).rejects.toThrow();
    });

    expect(result.current.uploading).toBe(false);
  });
});
