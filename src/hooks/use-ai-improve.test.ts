import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockImproveText = vi.fn();
vi.mock("@/actions/ai", () => ({
  improveText: (...args: unknown[]) => mockImproveText(...args),
}));

import { useAIImprove } from "./use-ai-improve";

describe("useAIImprove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useAIImprove());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("sets result on successful improve call", async () => {
    mockImproveText.mockResolvedValueOnce({ result: "Improved text here" });

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Original text", "improve");
    });

    expect(result.current.result).toBe("Improved text here");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("passes text and action to the server action", async () => {
    mockImproveText.mockResolvedValue({ result: "Result" });

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Some text", "shorten");
    });

    expect(mockImproveText).toHaveBeenCalledWith("Some text", "shorten");
  });

  it("sets error when server action returns an error", async () => {
    mockImproveText.mockResolvedValueOnce({
      error: "Gemini API key is not configured",
    });

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Some text", "improve");
    });

    expect(result.current.error).toBe("Gemini API key is not configured");
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error when server action throws", async () => {
    mockImproveText.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Some text", "improve");
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("resets state with reset()", async () => {
    mockImproveText.mockResolvedValueOnce({ result: "Improved" });

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Text", "improve");
    });

    expect(result.current.result).toBe("Improved");

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("handles all four action types", async () => {
    const actions = ["improve", "shorten", "expand", "grammar"] as const;

    for (const action of actions) {
      mockImproveText.mockResolvedValueOnce({
        result: `Result for ${action}`,
      });

      const { result } = renderHook(() => useAIImprove());

      await act(async () => {
        await result.current.improve("Text", action);
      });

      expect(result.current.result).toBe(`Result for ${action}`);
    }
  });
});
