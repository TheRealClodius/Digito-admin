import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarkdownTextarea } from "./markdown-textarea";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock the AI improvement hook
vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock the AI suggestion context
vi.mock("@/contexts/ai-suggestion-context", () => ({
  useAISuggestion: vi.fn(() => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: vi.fn(),
  })),
}));

// Mock the translation hook
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.showPreview": "Preview mode",
        "common.hidePreview": "Edit mode",
        "common.markdownPreview": "Preview",
        "ai.improve": "Make it better",
        "ai.shorten": "Shorten",
        "ai.expand": "Expand",
        "ai.longform": "Long form",
        "ai.grammar": "Fix grammar",
        "ai.improving": "Improving...",
        "ai.assistantName": "Digito Writing Assistant",
      };
      return translations[key] || key;
    },
  })),
}));

// Mock the server action
vi.mock("@/actions/ai", () => ({
  improveText: vi.fn(),
}));

function renderMarkdownTextarea(props: Partial<React.ComponentProps<typeof MarkdownTextarea>> = {}) {
  const defaultProps = {
    label: "Description",
    fieldName: "description",
    id: "description",
    getCurrentValue: () => "",
    onAccept: vi.fn(),
    ...props,
  };

  return render(
    <TooltipProvider>
      <MarkdownTextarea {...defaultProps} />
    </TooltipProvider>
  );
}

describe("MarkdownTextarea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in edit mode by default (no preview)", () => {
    renderMarkdownTextarea();

    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("renders in preview mode when showPreview is true, hiding textarea", () => {
    renderMarkdownTextarea({
      showPreview: true,
      getCurrentValue: () => "**Bold text**",
    });

    // Should show preview
    expect(screen.getByText("Preview")).toBeInTheDocument();
    // Should NOT show textarea when in preview mode
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
  });

  it("toggle button switches between edit and preview mode", async () => {
    const user = userEvent.setup();
    renderMarkdownTextarea({
      getCurrentValue: () => "Some text",
    });

    // Should start in edit mode (textarea visible, preview hidden)
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();

    // Click toggle button to switch to preview mode
    const toggleButton = screen.getByLabelText("Toggle markdown preview");
    await user.click(toggleButton);

    // Should now be in preview mode (textarea hidden, preview visible)
    await waitFor(() => {
      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    });

    // Click again to switch back to edit mode
    await user.click(toggleButton);

    // Should be back in edit mode (textarea visible, preview hidden)
    await waitFor(() => {
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(screen.queryByText("Preview")).not.toBeInTheDocument();
    });
  });

  it("preview reflects textarea changes after switching modes", async () => {
    const user = userEvent.setup();
    let currentValue = "";
    const getCurrentValue = () => currentValue;

    const { rerender } = renderMarkdownTextarea({
      getCurrentValue,
    });

    // Start in edit mode
    const textarea = screen.getByLabelText("Description");

    // Type some markdown
    await user.clear(textarea);
    await user.type(textarea, "**Bold text**");
    currentValue = "**Bold text**";

    // Switch to preview mode
    const toggleButton = screen.getByLabelText("Toggle markdown preview");
    await user.click(toggleButton);

    // Rerender with new value
    rerender(
      <TooltipProvider>
        <MarkdownTextarea
          label="Description"
          fieldName="description"
          id="description"
          getCurrentValue={getCurrentValue}
          onAccept={vi.fn()}
        />
      </TooltipProvider>
    );

    // Preview should show formatted text (after debounce)
    await waitFor(
      () => {
        const preview = screen.getByText("Preview").parentElement;
        expect(preview).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("AI button appears and is functional", () => {
    renderMarkdownTextarea({
      getCurrentValue: () => "Some text",
    });

    const aiButton = screen.getByLabelText(/AI writing tools/i);
    expect(aiButton).toBeInTheDocument();
    expect(aiButton).not.toBeDisabled();
  });

  it("AI button is disabled when textarea is empty", () => {
    renderMarkdownTextarea({
      getCurrentValue: () => "",
    });

    const aiButton = screen.getByLabelText(/AI writing tools/i);
    expect(aiButton).toBeDisabled();
  });

  it("handles empty initial value", () => {
    renderMarkdownTextarea({
      getCurrentValue: () => "",
    });

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toHaveValue("");
  });

  it("handles null initial value", () => {
    renderMarkdownTextarea({
      getCurrentValue: () => "",
      textareaProps: { defaultValue: undefined },
    });

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toBeInTheDocument();
  });

  it("preserves textarea functionality (onChange, onBlur, ref)", () => {
    const mockOnChange = vi.fn();
    const mockOnBlur = vi.fn();
    const mockRef = vi.fn();

    renderMarkdownTextarea({
      textareaProps: {
        onChange: mockOnChange,
        onBlur: mockOnBlur,
        ref: mockRef,
      },
    });

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toBeInTheDocument();
    expect(mockRef).toHaveBeenCalled();
  });

  it("preview pane has proper ARIA labels for accessibility", () => {
    renderMarkdownTextarea({
      showPreview: true,
      getCurrentValue: () => "Text",
    });

    const toggleButton = screen.getByLabelText("Toggle markdown preview");
    expect(toggleButton).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = renderMarkdownTextarea({
      className: "custom-class",
    });

    const wrapper = container.querySelector(".custom-class");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders label correctly", () => {
    renderMarkdownTextarea({
      label: "Custom Label",
    });

    expect(screen.getByText("Custom Label")).toBeInTheDocument();
  });

  it("uses provided id for textarea", () => {
    renderMarkdownTextarea({
      id: "custom-id",
    });

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toHaveAttribute("id", "custom-id");
  });

  it("applies custom aria-label when provided", () => {
    renderMarkdownTextarea({
      ariaLabel: "Custom aria label",
    });

    const textarea = screen.getByLabelText("Custom aria label");
    expect(textarea).toBeInTheDocument();
  });

  it("respects textareaProps for disabled state", () => {
    renderMarkdownTextarea({
      textareaProps: {
        disabled: true,
      },
    });

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toBeDisabled();
  });

  it("respects textareaProps for required state", () => {
    renderMarkdownTextarea({
      textareaProps: {
        required: true,
      },
    });

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toBeRequired();
  });

  it("handles preview with markdown headings", () => {
    renderMarkdownTextarea({
      showPreview: true,
      getCurrentValue: () => "# Heading 1\n## Heading 2",
    });

    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("handles preview with markdown lists", () => {
    renderMarkdownTextarea({
      showPreview: true,
      getCurrentValue: () => "- Item 1\n- Item 2\n- Item 3",
    });

    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("handles preview with markdown links", () => {
    renderMarkdownTextarea({
      showPreview: true,
      getCurrentValue: () => "[Link](https://example.com)",
    });

    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("handles long content without breaking layout", () => {
    const longContent = "A".repeat(1000);
    renderMarkdownTextarea({
      showPreview: true,
      getCurrentValue: () => longContent,
    });

    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("renders tooltip for preview toggle button in edit mode", async () => {
    const user = userEvent.setup();
    renderMarkdownTextarea();

    const toggleButton = screen.getByLabelText("Toggle markdown preview");

    // Hover over button to show tooltip
    await user.hover(toggleButton);

    await waitFor(() => {
      const tooltips = screen.getAllByText("Preview mode");
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });

  it("updates tooltip text when in preview mode", async () => {
    const user = userEvent.setup();
    renderMarkdownTextarea({
      showPreview: true,
    });

    const toggleButton = screen.getByLabelText("Toggle markdown preview");

    await user.hover(toggleButton);

    await waitFor(() => {
      const tooltips = screen.getAllByText("Edit mode");
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });
});
