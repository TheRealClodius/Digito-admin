import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

// Wrap render to include TooltipProvider
function render(ui: React.ReactElement, options = {}) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>, options);
}

// Mock Firebase modules before any imports that might trigger initialization
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date() }),
  },
}));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock WysiwygEditor to render a simple textarea in form tests
vi.mock("@/components/wysiwyg-editor", () => ({
  WysiwygEditor: ({ label, id, value, onChange }: { label: string; id: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} />
    </div>
  ),
}));

vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("@/contexts/ai-suggestion-context", () => ({
  useAISuggestion: vi.fn(() => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: vi.fn(),
  })),
}));

// Mock next/image so it renders a plain <img> in jsdom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { PostForm } from "./post-form";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PostForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----- Form field rendering -----

  describe("form fields", () => {
    it("renders an Image upload area", () => {
      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText("Image")).toBeInTheDocument();
    });

    it("renders a description textarea", () => {
      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
      const descriptionField = screen.getByRole("textbox", { name: /description/i });
    });

    it("renders an Author Name input field", () => {
      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/author name/i)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /save|submit|create/i }),
      ).toBeInTheDocument();
    });

    it("renders a cancel button", () => {
      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });
  });

  // ----- Submit button disabled state -----

  describe("submit button disabled state", () => {
    it("disables the submit button when no image is provided", () => {
      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("enables the submit button when an image URL is provided via defaultValues", () => {
      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      expect(submitButton).toBeEnabled();
    });
  });

  // ----- Validation -----

  describe("validation", () => {
    it("shows a validation error when image is missing and form submission is attempted", async () => {
      const user = userEvent.setup();

      render(<PostForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      // Try to trigger validation by interacting with the form
      const descField = screen.getByRole("textbox", { name: /description/i });
      await user.click(descField);
      await user.tab(); // blur

      await waitFor(() => {
        expect(screen.getByText(/image is required/i)).toBeInTheDocument();
      });
    });
  });

  // ----- Pre-filling with defaultValues (edit mode) -----

  describe("edit mode with defaultValues", () => {
    it("pre-fills the description field with the default value", () => {
      render(
        <PostForm
          defaultValues={{
            imageUrl: "https://example.com/photo.jpg",
            description: "Existing description",
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const descriptionInput = screen.getByRole("textbox", { name: /description/i });
      expect(descriptionInput).toHaveValue("Existing description");
    });

    it("pre-fills the author name field with the default value", () => {
      render(
        <PostForm
          defaultValues={{
            imageUrl: "https://example.com/photo.jpg",
            authorName: "John Doe",
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const authorInput = screen.getByLabelText(/author name/i);
      expect(authorInput).toHaveValue("John Doe");
    });

    it("handles null description in defaultValues", () => {
      render(
        <PostForm
          defaultValues={{
            imageUrl: "https://example.com/photo.jpg",
            description: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const descriptionInput = screen.getByRole("textbox", { name: /description/i });
      expect(descriptionInput).toHaveValue("");
    });

    it("handles null author name in defaultValues", () => {
      render(
        <PostForm
          defaultValues={{
            imageUrl: "https://example.com/photo.jpg",
            authorName: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const authorInput = screen.getByLabelText(/author name/i);
      expect(authorInput).toHaveValue("");
    });

    it("submits the updated data after editing pre-filled values", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <PostForm
          defaultValues={{
            imageUrl: "https://example.com/photo.jpg",
            description: "Old description",
            authorName: "Old Author",
          }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const descriptionInput = screen.getByRole("textbox", { name: /description/i });
      await user.clear(descriptionInput);
      await user.type(descriptionInput, "Updated description");

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Updated description",
        }),
      );
    });
  });

  // ----- Event logo as author avatar -----

  describe("event logo as author avatar", () => {
    it("automatically sets authorAvatarUrl to eventLogoUrl when submitting", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          eventLogoUrl="https://example.com/event-logo.jpg"
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          authorAvatarUrl: "https://example.com/event-logo.jpg",
        }),
      );
    });

    it("uses empty string for authorAvatarUrl when eventLogoUrl is not provided", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          authorAvatarUrl: "",
        }),
      );
    });
  });

  // ----- Cancel button -----

  describe("cancel button", () => {
    it("calls onCancel when the cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<PostForm onSubmit={vi.fn()} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("does not call onSubmit when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PostForm onSubmit={onSubmit} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Loading / submitting state -----

  describe("loading state", () => {
    it("disables the submit button when submitStatus is saving", () => {
      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create|saving|submitting/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("shows a loading indicator on the submit button when submitStatus is saving", () => {
      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />,
      );

      expect(
        screen.getByText(/saving|submitting|loading/i),
      ).toBeInTheDocument();
    });

    it("does not show loading state when submitStatus is idle", () => {
      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="idle"
        />,
      );

      expect(
        screen.queryByText(/saving|submitting|loading/i),
      ).not.toBeInTheDocument();
    });

    it("disables the cancel button when submitStatus is saving", () => {
      render(
        <PostForm
          defaultValues={{ imageUrl: "https://example.com/photo.jpg" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />,
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });
});
