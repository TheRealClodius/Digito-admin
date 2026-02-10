import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the Gemini SDK
const mockGenerateContent = vi.fn();
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel() {
        return { generateContent: mockGenerateContent };
      }
    },
  };
});

import { useAIImprove } from "./use-ai-improve";

describe("useAIImprove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set the env var for tests
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "test-api-key");
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useAIImprove());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("sets result on successful improve call", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "Improved text here" },
    });

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Original text", "improve");
    });

    expect(result.current.result).toBe("Improved text here");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls Gemini with the correct prompt for each action", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Result" },
    });

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Some text", "shorten");
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining("shorter and more concise")
    );
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining("Some text")
    );
  });

  it("sets error when Gemini API throws", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("API quota exceeded"));

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Some text", "improve");
    });

    expect(result.current.error).toBe("API quota exceeded");
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error when API key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "");

    const { result } = renderHook(() => useAIImprove());

    await act(async () => {
      await result.current.improve("Some text", "improve");
    });

    expect(result.current.error).toBe("Gemini API key is not configured");
    expect(result.current.isLoading).toBe(false);
  });

  it("resets state with reset()", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "Improved" },
    });

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
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => `Result for ${action}` },
      });

      const { result } = renderHook(() => useAIImprove());

      await act(async () => {
        await result.current.improve("Text", action);
      });

      expect(result.current.result).toBe(`Result for ${action}`);
    }
  });
});
