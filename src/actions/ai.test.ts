import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { improveText } from "./ai";

const mockGenerateContent = vi.fn();

// Mock the GoogleGenAI module
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function (this: any) {
    this.models = {
      generateContent: mockGenerateContent,
    };
  }),
}));

describe("improveText", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("API Key Validation", () => {
    it("should return error when GEMINI_API_KEY is not configured", async () => {
      delete process.env.GEMINI_API_KEY;

      const result = await improveText("test text", "improve");

      expect(result).toEqual({
        error: "Gemini API key is not configured",
      });
    });
  });

  describe("Action Validation", () => {
    it("should return error for invalid action", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      // @ts-expect-error - testing invalid action
      const result = await improveText("test text", "invalid-action");

      expect(result).toEqual({
        error: "Invalid action",
      });
    });
  });

  describe("Model Configuration", () => {
    it("should use GEMINI_MODEL environment variable when set", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";

      mockGenerateContent.mockResolvedValue({
        text: "improved text",
      });

      await improveText("test text", "improve");

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.5-flash-lite",
        })
      );
    });

    it("should fallback to default model when GEMINI_MODEL is not set", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      delete process.env.GEMINI_MODEL;

      mockGenerateContent.mockResolvedValue({
        text: "improved text",
      });

      await improveText("test text", "improve");

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.5-flash-lite",
        })
      );
    });
  });

  describe("Successful Response", () => {
    it("should return improved text on success", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";

      mockGenerateContent.mockResolvedValue({
        text: "This is the improved version of your text",
      });

      const result = await improveText("test text", "improve");

      expect(result).toEqual({
        result: "This is the improved version of your text",
      });
    });

    it("should handle empty response text", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      mockGenerateContent.mockResolvedValue({
        text: undefined,
      });

      const result = await improveText("test text", "improve");

      expect(result).toEqual({
        result: "",
      });
    });
  });

  describe("Error Handling", () => {
    it("should return user-friendly error message on API error", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";

      mockGenerateContent.mockRejectedValue(new Error("429 API quota exceeded"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await improveText("test text", "improve");

      expect(result.error).toContain("AI service error");
      expect(result.error).toContain("Please check your API configuration");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[AI Action Error]",
        expect.objectContaining({
          action: "improve",
          modelName: "gemini-2.5-flash-lite",
        })
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      mockGenerateContent.mockRejectedValue("Something went wrong");

      const result = await improveText("test text", "improve");

      expect(result.error).toContain("Failed to improve text");
    });
  });

  describe("Action Prompts", () => {
    it.each([
      ["improve", "test text"],
      ["shorten", "long text that needs to be shortened"],
      ["expand", "short"],
      ["longform", "brief text"],
      ["grammar", "text with erors"],
    ] as const)(
      "should work with %s action",
      async (action, inputText) => {
        process.env.GEMINI_API_KEY = "test-key";

        mockGenerateContent.mockResolvedValue({
          text: "processed text",
        });

        const result = await improveText(inputText, action);

        expect(result.result).toBe("processed text");
        expect(mockGenerateContent).toHaveBeenCalledWith(
          expect.objectContaining({
            contents: expect.stringContaining(inputText),
          })
        );
      }
    );
  });
});
