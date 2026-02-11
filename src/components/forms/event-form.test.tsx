import {
  render as rtlRender,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

// Wrap render to include TooltipProvider
function render(ui: React.ReactElement, options = {}) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>, options);
}
import userEvent from "@testing-library/user-event";
import { EventForm } from "./event-form";

// Mock Firebase to prevent initialization errors
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


vi.mock("@/hooks/use-upload", () => ({
  useUpload: vi.fn(() => ({
    upload: vi.fn(),
    deleteFile: vi.fn(),
    progress: 0,
    uploading: false,
    error: null,
  })),
}));

vi.mock("@/components/image-upload", () => ({
  ImageUpload: ({ value }: { value: string | null }) => (
    <div data-testid="image-upload">{value || "empty"}</div>
  ),
}));

// Mock next/image so it renders a plain <img> in jsdom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  clientId: "client-1",
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  storagePath: "clients/client-1/events",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Renders expected fields ----

  it("renders the Name field", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("renders the Description field", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
  });

  it("renders the Venue field", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByLabelText(/venue/i)).toBeInTheDocument();
  });

  it("renders Start Date and End Date fields", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it("renders Website URL and Instagram URL fields", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/instagram url/i)).toBeInTheDocument();
  });

  it("renders the Digito Chat welcome screen field with a helpful placeholder", () => {
    render(<EventForm {...defaultProps} />);

    const chatPromptField = screen.getByLabelText(/digito chat welcome screen/i);
    expect(chatPromptField).toBeInTheDocument();
    expect(chatPromptField).toHaveAttribute(
      "placeholder",
      expect.stringMatching(/ask me anything about/i),
    );
  });

  it("does NOT render an Is Active toggle when creating (new event)", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.queryByLabelText(/active/i)).not.toBeInTheDocument();
  });

  it("renders an Is Active toggle when editing (defaultValues provided)", () => {
    render(
      <EventForm {...defaultProps} defaultValues={{ name: "Edit Me", isActive: true }} />,
    );

    expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
  });

  it("renders Logo and Banner upload areas", () => {
    render(<EventForm {...defaultProps} />);

    expect(screen.getByText(/logo/i)).toBeInTheDocument();
    expect(screen.getByText(/banner/i)).toBeInTheDocument();
  });

  // ---- Submit and Cancel buttons ----

  it("renders a submit button and a cancel button", () => {
    render(<EventForm {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /save|submit|create/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });

  // ---- Submit disabled when name is empty ----

  it("submit button is disabled when the name field is empty", () => {
    render(<EventForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });
    expect(submitButton).toBeDisabled();
  });

  // ---- Validation: name required ----

  it("shows a validation error when submitting with an empty name", async () => {
    const user = userEvent.setup();
    render(<EventForm {...defaultProps} />);

    // Validation runs on submit. Programmatically submit the form to trigger validation.
    const form = screen.getByLabelText(/name/i).closest("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  // ---- Validation: dates required ----

  it("shows validation errors when dates are missing on submit", async () => {
    const user = userEvent.setup();
    render(<EventForm {...defaultProps} />);

    // Fill in name so it passes that validation
    const nameField = screen.getByLabelText(/name/i);
    await user.type(nameField, "My Event");

    // Attempt to submit
    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });

    // The button might be enabled after typing the name, so we try clicking
    // if it's not disabled; otherwise trigger form validation another way.
    if (!submitButton.hasAttribute("disabled")) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/start date is required/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/end date is required/i),
      ).toBeInTheDocument();
    });
  });

  // ---- Calls onSubmit with form data including clientId ----

  it("calls onSubmit with form data including clientId on valid submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <EventForm
        {...defaultProps}
        onSubmit={onSubmit}
        defaultValues={{
          name: "Pre-filled Event",
          startDate: new Date("2026-06-15T09:00:00"),
          endDate: new Date("2026-06-17T18:00:00"),
        }}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData).toEqual(
      expect.objectContaining({
        clientId: "client-1",
        name: "Pre-filled Event",
      }),
    );
  });

  // ---- Pre-fills form in edit mode ----

  it("pre-fills form fields when defaultValues are provided (edit mode)", () => {
    render(
      <EventForm
        {...defaultProps}
        defaultValues={{
          name: "Existing Event",
          description: "Some description",
          venue: "Grand Hall",
          websiteUrl: "https://example.com",
          instagramUrl: "https://instagram.com/event",
          chatPrompt: "Ask me anything about the event",
          isActive: false,
        }}
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Existing Event");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue(
      "Some description",
    );
    expect(screen.getByLabelText(/venue/i)).toHaveValue("Grand Hall");
    expect(screen.getByLabelText(/website url/i)).toHaveValue(
      "https://example.com",
    );
    expect(screen.getByLabelText(/instagram url/i)).toHaveValue(
      "https://instagram.com/event",
    );
    expect(screen.getByLabelText(/digito chat welcome screen/i)).toHaveValue(
      "Ask me anything about the event",
    );
  });

  // ---- Cancel button calls onCancel ----

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<EventForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ---- isActive: true for new events, toggle only when editing ----

  it("submits isActive: true when creating (no defaultValues)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<EventForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), "New Event");
    await user.type(screen.getByLabelText(/start date/i), "2026-06-15T09:00");
    await user.type(screen.getByLabelText(/end date/i), "2026-06-17T18:00");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  it("respects isActive: false from defaultValues when editing", () => {
    render(
      <EventForm {...defaultProps} defaultValues={{ name: "Edit", isActive: false }} />,
    );

    const activeToggle = screen.getByLabelText(/active/i);
    expect(activeToggle).not.toBeChecked();
  });

  // ---- submitStatus disables the submit button ----

  it("disables the submit button when submitStatus is saving", () => {
    render(
      <EventForm
        {...defaultProps}
        submitStatus="saving"
        defaultValues={{
          name: "Some Event",
          startDate: new Date("2026-06-15"),
          endDate: new Date("2026-06-17"),
        }}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create|saving|submitting/i,
    });
    expect(submitButton).toBeDisabled();
  });

  // ---- Does not call onSubmit when form is invalid ----

  it("does not call onSubmit when form validation fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<EventForm {...defaultProps} onSubmit={onSubmit} />);

    // The name field is empty, so the button should be disabled.
    // But let's also make sure onSubmit is never called.
    const nameField = screen.getByLabelText(/name/i);
    await user.click(nameField);
    await user.tab();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // ---- Null defaultValues are treated as empty ----

  it("handles null values in defaultValues gracefully", () => {
    render(
      <EventForm
        {...defaultProps}
        defaultValues={{
          name: "Event",
          description: null,
          venue: null,
          websiteUrl: null,
          instagramUrl: null,
          chatPrompt: null,
          logoUrl: null,
          bannerUrl: null,
        }}
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Event");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("");
    expect(screen.getByLabelText(/venue/i)).toHaveValue("");
  });

  // ---- Image Upload components ----

  it("renders two ImageUpload components for logo and banner", () => {
    render(<EventForm {...defaultProps} />);

    const uploads = screen.getAllByTestId("image-upload");
    expect(uploads).toHaveLength(2);
  });

  it("passes existing logo and banner URLs to ImageUpload", () => {
    render(
      <EventForm
        {...defaultProps}
        defaultValues={{
          name: "Event With Images",
          logoUrl: "https://example.com/logo.png",
          bannerUrl: "https://example.com/banner.png",
        }}
      />,
    );

    const uploads = screen.getAllByTestId("image-upload");
    expect(uploads[0]).toHaveTextContent("https://example.com/logo.png");
    expect(uploads[1]).toHaveTextContent("https://example.com/banner.png");
  });
});
