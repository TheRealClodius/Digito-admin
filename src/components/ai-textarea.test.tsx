import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock the AI hook
const mockImprove = vi.fn();
const mockReset = vi.fn();
const mockUseAIImprove = vi.fn(() => ({
  isLoading: false,
  error: null,
  result: null,
  improve: mockImprove,
  reset: mockReset,
}));

vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: (...args: unknown[]) => mockUseAIImprove(...args),
}));

// Mock sonner
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

// Mock the context
const mockSetHasActiveSuggestion = vi.fn();
vi.mock("@/contexts/ai-suggestion-context", () => ({
  useAISuggestion: () => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: mockSetHasActiveSuggestion,
  }),
}));

// Mock translation hook
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "ai.improve": "Improve clarity",
        "ai.shorten": "Shorten",
        "ai.expand": "Expand",
        "ai.longform": "Long form",
        "ai.grammar": "Fix grammar",
        "ai.improving": "Improving...",
        "ai.assistantName": "Digito Writing Assistant",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { AITextarea } from "./ai-textarea";

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("AITextarea", () => {
  const defaultProps = {
    label: "Description",
    fieldName: "description",
    id: "description",
    getCurrentValue: () => "Some existing text",
    onAccept: vi.fn(),
    textareaProps: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAIImprove.mockReturnValue({
      isLoading: false,
      error: null,
      result: null,
      improve: mockImprove,
      reset: mockReset,
    });
  });

  // ----- Default state -----

  describe("default state", () => {
    it("renders the label", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders the textarea", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders the wand trigger button", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeInTheDocument();
    });

    it("disables the button when text is empty", () => {
      renderWithProviders(
        <AITextarea {...defaultProps} getCurrentValue={() => ""} />
      );

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeDisabled();
    });

    it("disables the button when text is only whitespace", () => {
      renderWithProviders(
        <AITextarea {...defaultProps} getCurrentValue={() => "   "} />
      );

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeDisabled();
    });

    it("does not show the suggestion card", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.queryByText("Digito Writing Assistant")).not.toBeInTheDocument();
    });

    it("passes textareaProps to the textarea element", () => {
      renderWithProviders(
        <AITextarea
          {...defaultProps}
          textareaProps={{ placeholder: "Write here..." }}
        />
      );

      expect(screen.getByPlaceholderText("Write here...")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = renderWithProviders(
        <AITextarea {...defaultProps} className="col-span-2" />
      );

      expect(container.firstChild).toHaveClass("col-span-2");
    });

    it("sets htmlFor on label and id on textarea", () => {
      renderWithProviders(<AITextarea {...defaultProps} id="my-field" />);

      const label = screen.getByText("Description");
      expect(label).toHaveAttribute("for", "my-field");
      expect(screen.getByRole("textbox")).toHaveAttribute("id", "my-field");
    });
  });

  // ----- Dropdown menu -----

  describe("dropdown menu", () => {
    it("shows five action items when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AITextarea {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );

      expect(screen.getByText("Improve clarity")).toBeInTheDocument();
      expect(screen.getByText("Shorten")).toBeInTheDocument();
      expect(screen.getByText("Expand")).toBeInTheDocument();
      expect(screen.getByText("Long form")).toBeInTheDocument();
      expect(screen.getByText("Fix grammar")).toBeInTheDocument();
    });

    it("calls improve with the correct action", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AITextarea {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );
      await user.click(screen.getByText("Improve clarity"));

      expect(mockImprove).toHaveBeenCalledWith("Some existing text", "improve");
    });
  });

  // ----- Loading state -----

  describe("loading state", () => {
    beforeEach(() => {
      mockUseAIImprove.mockReturnValue({
        isLoading: true,
        error: null,
        result: null,
        improve: mockImprove,
        reset: mockReset,
      });
    });

    it("shows loading indicator", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByText(/improving/i)).toBeInTheDocument();
    });

    it("hides the trigger button when loading", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(
        screen.queryByRole("button", { name: /ai writing tools/i })
      ).not.toBeInTheDocument();
    });

    it("still shows the textarea", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  // ----- Result state (side-by-side) -----

  describe("result state", () => {
    beforeEach(() => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: null,
        result: "This is the AI-improved text.",
        improve: mockImprove,
        reset: mockReset,
      });
    });

    it("shows the suggestion card with the result text", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByText("Digito Writing Assistant")).toBeInTheDocument();
      expect(
        screen.getByText("This is the AI-improved text.")
      ).toBeInTheDocument();
    });

    it("shows Accept and Reject buttons", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /accept/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reject/i })
      ).toBeInTheDocument();
    });

    it("still shows the textarea alongside the suggestion", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(
        screen.getByText("This is the AI-improved text.")
      ).toBeInTheDocument();
    });

    it("calls onAccept with the result and resets when Accept is clicked", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();

      renderWithProviders(<AITextarea {...defaultProps} onAccept={onAccept} />);

      await user.click(screen.getByRole("button", { name: /accept/i }));

      expect(onAccept).toHaveBeenCalledWith("This is the AI-improved text.");
      expect(mockReset).toHaveBeenCalled();
    });

    it("calls reset without calling onAccept when Reject is clicked", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();

      renderWithProviders(<AITextarea {...defaultProps} onAccept={onAccept} />);

      await user.click(screen.getByRole("button", { name: /reject/i }));

      expect(mockReset).toHaveBeenCalled();
      expect(onAccept).not.toHaveBeenCalled();
    });

    it("notifies the context that a suggestion is active", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(mockSetHasActiveSuggestion).toHaveBeenCalledWith(true);
    });
  });

  // ----- Context cleanup -----

  describe("context signaling", () => {
    it("signals false when there is no result", () => {
      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(mockSetHasActiveSuggestion).toHaveBeenCalledWith(false);
    });
  });

  // ----- Error handling -----

  describe("error handling", () => {
    it("shows error toast when error occurs", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: "Something went wrong",
        result: null,
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(mockToastError).toHaveBeenCalledWith(
        "AI Writing Assistant Error",
        { description: "Something went wrong" }
      );
    });
  });

  // ----- Markdown rendering -----

  describe("markdown rendering in preview", () => {
    it("renders markdown headers as HTML headings", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: null,
        result: "## Heading Two\n\nSome content",
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByRole("heading", { level: 2, name: "Heading Two" })).toBeInTheDocument();
    });

    it("renders markdown bold text", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: null,
        result: "This is **bold text**",
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AITextarea {...defaultProps} />);

      const boldElement = screen.getByText("bold text");
      expect(boldElement.tagName).toBe("STRONG");
    });

    it("renders markdown lists", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: null,
        result: "- Item one\n- Item two",
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByText("Item one")).toBeInTheDocument();
      expect(screen.getByText("Item two")).toBeInTheDocument();
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("renders plain text without markdown", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: null,
        result: "Just plain text here",
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AITextarea {...defaultProps} />);

      expect(screen.getByText("Just plain text here")).toBeInTheDocument();
    });
  });
});
