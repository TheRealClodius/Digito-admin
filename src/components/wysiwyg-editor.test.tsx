import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WysiwygEditor } from "./wysiwyg-editor";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock Tiptap - jsdom doesn't support contenteditable
const mockEditor = {
  getHTML: vi.fn(() => "<p></p>"),
  commands: {
    setContent: vi.fn(),
  },
  storage: {
    markdown: {
      getMarkdown: vi.fn(() => ""),
    },
  },
  chain: vi.fn(() => mockEditor._chainObj),
  isActive: vi.fn(() => false),
  isEmpty: true,
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  _chainObj: {
    focus: vi.fn(() => mockEditor._chainObj),
    toggleBold: vi.fn(() => mockEditor._chainObj),
    run: vi.fn(),
  },
};

let onUpdateCallback: ((props: { editor: typeof mockEditor }) => void) | null =
  null;

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config: { onUpdate?: typeof onUpdateCallback }) => {
    if (config?.onUpdate) {
      onUpdateCallback = config.onUpdate;
    }
    return mockEditor;
  }),
  EditorContent: vi.fn(({ editor }: { editor: typeof mockEditor }) => (
    <div
      data-testid="editor-content"
      role="textbox"
      aria-label="Rich text editor"
      contentEditable
    >
      {editor?.getHTML?.() ?? ""}
    </div>
  )),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: { configure: vi.fn(() => ({})) },
}));

// Mock the AI improvement hook
const mockImprove = vi.fn();
const mockReset = vi.fn();
vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: mockImprove,
    reset: mockReset,
  })),
}));

// Mock the AI suggestion context
const mockSetHasActiveSuggestion = vi.fn();
vi.mock("@/contexts/ai-suggestion-context", () => ({
  useAISuggestion: vi.fn(() => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: mockSetHasActiveSuggestion,
  })),
}));

// useTranslation is mocked globally in setup.ts (resolves real en.json keys)

// Mock the server action
vi.mock("@/actions/ai", () => ({
  improveText: vi.fn(),
}));

function renderEditor(
  props: Partial<React.ComponentProps<typeof WysiwygEditor>> = {}
) {
  const defaultProps = {
    label: "Description",
    fieldName: "description",
    id: "description",
    value: "",
    onChange: vi.fn(),
    getCurrentValue: () => "",
    onAccept: vi.fn(),
    ...props,
  };

  return render(
    <TooltipProvider>
      <WysiwygEditor {...defaultProps} />
    </TooltipProvider>
  );
}

describe("WysiwygEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor.isEmpty = true;
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("");
    onUpdateCallback = null;
  });

  // Rendering
  it("renders a label with the provided text", () => {
    renderEditor({ label: "My Field" });
    expect(screen.getByText("My Field")).toBeInTheDocument();
  });

  it("renders an editable content area", () => {
    renderEditor();
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders the toolbar", () => {
    renderEditor();
    expect(screen.getByLabelText("Bold")).toBeInTheDocument();
    expect(screen.getByLabelText("Italic")).toBeInTheDocument();
    expect(screen.getByLabelText("Underline")).toBeInTheDocument();
  });

  it("applies custom className to the wrapper", () => {
    const { container } = renderEditor({ className: "my-custom-class" });
    expect(container.querySelector(".my-custom-class")).toBeInTheDocument();
  });

  // onChange callback
  it("calls onChange with markdown when editor content updates", () => {
    const onChange = vi.fn();
    renderEditor({ onChange });

    // Simulate editor update
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("**bold text**");
    if (onUpdateCallback) {
      onUpdateCallback({ editor: mockEditor });
    }

    expect(onChange).toHaveBeenCalledWith("**bold text**");
  });

  // External value changes (AI accept, form reset)
  it("calls setContent when value prop changes", () => {
    const { rerender } = renderEditor({ value: "initial" });

    mockEditor.storage.markdown.getMarkdown.mockReturnValue("initial");

    rerender(
      <TooltipProvider>
        <WysiwygEditor
          label="Description"
          fieldName="description"
          id="description"
          value="new value from AI"
          onChange={vi.fn()}
          getCurrentValue={() => ""}
          onAccept={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(mockEditor.commands.setContent).toHaveBeenCalledWith("new value from AI");
  });

  // AI integration
  it("renders the AI dropdown button (Wand2 icon)", () => {
    renderEditor();
    expect(
      screen.getByLabelText(/AI writing tools/i)
    ).toBeInTheDocument();
  });

  it("AI button is disabled when content is empty", () => {
    renderEditor({ getCurrentValue: () => "" });
    const aiButton = screen.getByLabelText(/AI writing tools/i);
    expect(aiButton).toBeDisabled();
  });

  it("AI button is enabled when content is not empty", () => {
    renderEditor({ getCurrentValue: () => "Some content" });
    const aiButton = screen.getByLabelText(/AI writing tools/i);
    expect(aiButton).not.toBeDisabled();
  });

  it("shows AI suggestion card when result is available", async () => {
    const { useAIImprove } = await import("@/hooks/use-ai-improve");
    vi.mocked(useAIImprove).mockReturnValue({
      isLoading: false,
      error: null,
      result: "Improved text here",
      improve: mockImprove,
      reset: mockReset,
    });

    renderEditor();

    expect(screen.getByText("Digito Writing Assistant")).toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("calls onAccept with AI result when Accept is clicked", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();

    const { useAIImprove } = await import("@/hooks/use-ai-improve");
    vi.mocked(useAIImprove).mockReturnValue({
      isLoading: false,
      error: null,
      result: "AI improved text",
      improve: mockImprove,
      reset: mockReset,
    });

    renderEditor({ onAccept });

    await user.click(screen.getByText("Accept"));

    expect(onAccept).toHaveBeenCalledWith("AI improved text");
    expect(mockReset).toHaveBeenCalled();
  });

  it("resets AI state when Reject is clicked", async () => {
    const user = userEvent.setup();

    const { useAIImprove } = await import("@/hooks/use-ai-improve");
    vi.mocked(useAIImprove).mockReturnValue({
      isLoading: false,
      error: null,
      result: "AI improved text",
      improve: mockImprove,
      reset: mockReset,
    });

    renderEditor();

    await user.click(screen.getByText("Reject"));

    expect(mockReset).toHaveBeenCalled();
  });

  it("shows loading state when AI is processing", async () => {
    const { useAIImprove } = await import("@/hooks/use-ai-improve");
    vi.mocked(useAIImprove).mockReturnValue({
      isLoading: true,
      error: null,
      result: null,
      improve: mockImprove,
      reset: mockReset,
    });

    renderEditor({ getCurrentValue: () => "some text" });

    expect(screen.getByText("Improving...")).toBeInTheDocument();
  });

  it("signals active suggestion to context when result is available", async () => {
    const { useAIImprove } = await import("@/hooks/use-ai-improve");
    vi.mocked(useAIImprove).mockReturnValue({
      isLoading: false,
      error: null,
      result: "suggestion",
      improve: mockImprove,
      reset: mockReset,
    });

    renderEditor();

    await waitFor(() => {
      expect(mockSetHasActiveSuggestion).toHaveBeenCalledWith(true);
    });
  });

  // Label and accessibility
  it("renders label correctly", () => {
    renderEditor({ label: "Custom Label" });
    expect(screen.getByText("Custom Label")).toBeInTheDocument();
  });
});
