import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WysiwygToolbar } from "./wysiwyg-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

// Create a mock editor that tracks chain calls
function createMockEditor(overrides: Record<string, boolean> = {}) {
  const runFn = vi.fn();
  const chainObj: Record<string, unknown> = {
    focus: vi.fn(() => chainObj),
    toggleBold: vi.fn(() => chainObj),
    toggleItalic: vi.fn(() => chainObj),
    toggleUnderline: vi.fn(() => chainObj),
    toggleHeading: vi.fn(() => chainObj),
    setParagraph: vi.fn(() => chainObj),
    run: runFn,
  };

  return {
    chain: vi.fn(() => chainObj),
    isActive: vi.fn((type: string, attrs?: Record<string, unknown>) => {
      if (attrs && "level" in attrs) return overrides[`heading-${attrs.level}`] ?? false;
      return overrides[type] ?? false;
    }),
    can: vi.fn(() => ({
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          toggleBold: vi.fn(() => ({ run: vi.fn(() => true) })),
          toggleItalic: vi.fn(() => ({ run: vi.fn(() => true) })),
          toggleUnderline: vi.fn(() => ({ run: vi.fn(() => true) })),
          toggleHeading: vi.fn(() => ({ run: vi.fn(() => true) })),
          setParagraph: vi.fn(() => ({ run: vi.fn(() => true) })),
        })),
      })),
    })),
    _chainObj: chainObj,
    _runFn: runFn,
  };
}

function renderToolbar(editor: ReturnType<typeof createMockEditor> | null = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(
    <TooltipProvider>
      <WysiwygToolbar editor={editor as any} />
    </TooltipProvider>
  );
}

describe("WysiwygToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null when editor is null", () => {
    const { container } = renderToolbar(null);
    expect(container.innerHTML).toBe("");
  });

  it("renders bold, italic, underline buttons and heading dropdown", () => {
    const editor = createMockEditor();
    renderToolbar(editor);

    expect(screen.getByLabelText("Bold")).toBeInTheDocument();
    expect(screen.getByLabelText("Italic")).toBeInTheDocument();
    expect(screen.getByLabelText("Underline")).toBeInTheDocument();
    expect(screen.getByLabelText("Heading style")).toBeInTheDocument();
  });

  it("clicking bold button calls toggleBold on the editor", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Bold"));

    expect(editor.chain).toHaveBeenCalled();
    expect(editor._chainObj.focus).toHaveBeenCalled();
    expect(editor._chainObj.toggleBold).toHaveBeenCalled();
    expect(editor._runFn).toHaveBeenCalled();
  });

  it("clicking italic button calls toggleItalic on the editor", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Italic"));

    expect(editor._chainObj.toggleItalic).toHaveBeenCalled();
    expect(editor._runFn).toHaveBeenCalled();
  });

  it("clicking underline button calls toggleUnderline on the editor", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Underline"));

    expect(editor._chainObj.toggleUnderline).toHaveBeenCalled();
    expect(editor._runFn).toHaveBeenCalled();
  });

  it("bold button has active state when selection is bold", () => {
    const editor = createMockEditor({ bold: true });
    renderToolbar(editor);

    const boldButton = screen.getByLabelText("Bold");
    expect(boldButton).toHaveAttribute("data-active", "true");
  });

  it("italic button has active state when selection is italic", () => {
    const editor = createMockEditor({ italic: true });
    renderToolbar(editor);

    const italicButton = screen.getByLabelText("Italic");
    expect(italicButton).toHaveAttribute("data-active", "true");
  });

  it("underline button has active state when selection is underline", () => {
    const editor = createMockEditor({ underline: true });
    renderToolbar(editor);

    const underlineButton = screen.getByLabelText("Underline");
    expect(underlineButton).toHaveAttribute("data-active", "true");
  });

  it("heading dropdown shows title, subtitle, and paragraph options", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Heading style"));

    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(3);
    expect(menuItems[0]).toHaveTextContent("Title");
    expect(menuItems[1]).toHaveTextContent("Subtitle");
    expect(menuItems[2]).toHaveTextContent("Paragraph");
  });

  it("selecting Title calls toggleHeading with level 1", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Heading style"));
    await user.click(screen.getByText("Title"));

    expect(editor._chainObj.toggleHeading).toHaveBeenCalledWith({ level: 1 });
    expect(editor._runFn).toHaveBeenCalled();
  });

  it("selecting Subtitle calls toggleHeading with level 2", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Heading style"));
    await user.click(screen.getByText("Subtitle"));

    expect(editor._chainObj.toggleHeading).toHaveBeenCalledWith({ level: 2 });
    expect(editor._runFn).toHaveBeenCalled();
  });

  it("selecting Paragraph calls setParagraph", async () => {
    const user = userEvent.setup();
    const editor = createMockEditor();
    renderToolbar(editor);

    await user.click(screen.getByLabelText("Heading style"));
    const menuItems = screen.getAllByRole("menuitem");
    await user.click(menuItems[2]); // Paragraph

    expect(editor._chainObj.setParagraph).toHaveBeenCalled();
    expect(editor._runFn).toHaveBeenCalled();
  });

  it("heading dropdown label reflects current heading level", () => {
    const editor = createMockEditor({ "heading-1": true });
    renderToolbar(editor);

    const headingButton = screen.getByLabelText("Heading style");
    expect(headingButton).toHaveTextContent("Title");
  });

  it("heading dropdown shows Subtitle when heading level 2 is active", () => {
    const editor = createMockEditor({ "heading-2": true });
    renderToolbar(editor);

    const headingButton = screen.getByLabelText("Heading style");
    expect(headingButton).toHaveTextContent("Subtitle");
  });

  it("heading dropdown shows Paragraph when no heading is active", () => {
    const editor = createMockEditor();
    renderToolbar(editor);

    const headingButton = screen.getByLabelText("Heading style");
    expect(headingButton).toHaveTextContent("Paragraph");
  });
});
