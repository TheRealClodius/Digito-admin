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

import { AICopyTools } from "./ai-copy-tools";

// Wrap in TooltipProvider for Radix
import { TooltipProvider } from "@/components/ui/tooltip";

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("AICopyTools", () => {
  const defaultProps = {
    fieldName: "description",
    getCurrentValue: () => "Some existing text",
    onAccept: vi.fn(),
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
    it("renders the sparkle trigger button", () => {
      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeInTheDocument();
    });

    it("disables the button when text is empty", () => {
      renderWithProviders(
        <AICopyTools {...defaultProps} getCurrentValue={() => ""} />
      );

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeDisabled();
    });

    it("disables the button when text is only whitespace", () => {
      renderWithProviders(
        <AICopyTools {...defaultProps} getCurrentValue={() => "   "} />
      );

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeDisabled();
    });

    it("enables the button when text has content", () => {
      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /ai writing tools/i })
      ).toBeEnabled();
    });
  });

  // ----- Dropdown menu -----

  describe("dropdown menu", () => {
    it("shows four action items when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AICopyTools {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );

      expect(screen.getByText("Improve clarity")).toBeInTheDocument();
      expect(screen.getByText("Shorten")).toBeInTheDocument();
      expect(screen.getByText("Expand")).toBeInTheDocument();
      expect(screen.getByText("Fix grammar")).toBeInTheDocument();
    });

    it("calls improve with 'improve' action when 'Improve clarity' is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AICopyTools {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );
      await user.click(screen.getByText("Improve clarity"));

      expect(mockImprove).toHaveBeenCalledWith("Some existing text", "improve");
    });

    it("calls improve with 'shorten' action when 'Shorten' is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AICopyTools {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );
      await user.click(screen.getByText("Shorten"));

      expect(mockImprove).toHaveBeenCalledWith("Some existing text", "shorten");
    });

    it("calls improve with 'expand' action when 'Expand' is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AICopyTools {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );
      await user.click(screen.getByText("Expand"));

      expect(mockImprove).toHaveBeenCalledWith("Some existing text", "expand");
    });

    it("calls improve with 'grammar' action when 'Fix grammar' is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AICopyTools {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: /ai writing tools/i })
      );
      await user.click(screen.getByText("Fix grammar"));

      expect(mockImprove).toHaveBeenCalledWith("Some existing text", "grammar");
    });
  });

  // ----- Loading state -----

  describe("loading state", () => {
    it("shows loading indicator when isLoading is true", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: true,
        error: null,
        result: null,
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(screen.getByText(/improving/i)).toBeInTheDocument();
    });

    it("does not show the trigger button when loading", () => {
      mockUseAIImprove.mockReturnValue({
        isLoading: true,
        error: null,
        result: null,
        improve: mockImprove,
        reset: mockReset,
      });

      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(
        screen.queryByRole("button", { name: /ai writing tools/i })
      ).not.toBeInTheDocument();
    });
  });

  // ----- Preview state -----

  describe("preview state", () => {
    beforeEach(() => {
      mockUseAIImprove.mockReturnValue({
        isLoading: false,
        error: null,
        result: "This is the AI-improved text.",
        improve: mockImprove,
        reset: mockReset,
      });
    });

    it("shows the suggestion text", () => {
      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(
        screen.getByText("This is the AI-improved text.")
      ).toBeInTheDocument();
    });

    it("shows Accept and Reject buttons", () => {
      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /accept/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reject/i })
      ).toBeInTheDocument();
    });

    it("calls onAccept with the result and resets when Accept is clicked", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();

      renderWithProviders(
        <AICopyTools {...defaultProps} onAccept={onAccept} />
      );

      await user.click(screen.getByRole("button", { name: /accept/i }));

      expect(onAccept).toHaveBeenCalledWith("This is the AI-improved text.");
      expect(mockReset).toHaveBeenCalled();
    });

    it("calls reset without calling onAccept when Reject is clicked", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();

      renderWithProviders(
        <AICopyTools {...defaultProps} onAccept={onAccept} />
      );

      await user.click(screen.getByRole("button", { name: /reject/i }));

      expect(mockReset).toHaveBeenCalled();
      expect(onAccept).not.toHaveBeenCalled();
    });

    it("does not show the trigger button when in preview state", () => {
      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(
        screen.queryByRole("button", { name: /ai writing tools/i })
      ).not.toBeInTheDocument();
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

      renderWithProviders(<AICopyTools {...defaultProps} />);

      expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
    });
  });
});
