import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HappeningForm } from "./happening-form";

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

vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: vi.fn(),
    reset: vi.fn(),
  })),
}));

// ResizeObserver mock (needed by some UI primitives in jsdom)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HappeningForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Renders expected fields ----

  it("renders the Title field", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("renders the Description field as a textarea", () => {
    render(<HappeningForm {...defaultProps} />);

    const description = screen.getByLabelText(/description/i);
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("TEXTAREA");
  });

  it("renders Start Time and End Time fields", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it("renders the Location field", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
  });

  it("renders the Type select field", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  it("renders the Host Name field", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/host name/i)).toBeInTheDocument();
  });

  it("renders an Is Highlighted toggle", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/highlighted/i)).toBeInTheDocument();
  });

  it("renders a Requires Access toggle", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(screen.getByLabelText(/requires access/i)).toBeInTheDocument();
  });

  // ---- Submit and Cancel buttons ----

  it("renders a submit button and a cancel button", () => {
    render(<HappeningForm {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /save|submit|create/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });

  // ---- Submit disabled when title is empty ----

  it("submit button is disabled when the title field is empty", () => {
    render(<HappeningForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });
    expect(submitButton).toBeDisabled();
  });

  // ---- Submit enabled when title has value ----

  it("submit button is enabled when the title field has a value", async () => {
    const user = userEvent.setup();
    render(<HappeningForm {...defaultProps} />);

    const titleField = screen.getByLabelText(/title/i);
    await user.type(titleField, "My Happening");

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });
    expect(submitButton).toBeEnabled();
  });

  // ---- Pre-fills form in edit mode ----

  it("pre-fills form fields when defaultValues are provided (edit mode)", () => {
    render(
      <HappeningForm
        {...defaultProps}
        defaultValues={{
          title: "Existing Happening",
          description: "Some description",
          location: "Hall A",
          type: "launch",
          hostName: "John Doe",
          isHighlighted: true,
          requiresAccess: true,
        }}
      />,
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Happening");
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      "Some description",
    );
    expect(screen.getByLabelText(/location/i)).toHaveValue("Hall A");
    expect(screen.getByLabelText(/type/i)).toHaveValue("launch");
    expect(screen.getByLabelText(/host name/i)).toHaveValue("John Doe");
    expect(screen.getByLabelText(/highlighted/i)).toBeChecked();
    expect(screen.getByLabelText(/requires access/i)).toBeChecked();
  });

  // ---- Cancel button calls onCancel ----

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<HappeningForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ---- submitStatus disables the submit button ----

  it("disables the submit button when submitStatus is saving", () => {
    render(
      <HappeningForm
        {...defaultProps}
        submitStatus="saving"
        defaultValues={{
          title: "Some Happening",
        }}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create|saving|submitting/i,
    });
    expect(submitButton).toBeDisabled();
  });

  // ---- Defaults: isHighlighted false, requiresAccess false ----

  it("defaults isHighlighted to false for a new happening", () => {
    render(<HappeningForm {...defaultProps} />);

    const highlightedToggle = screen.getByLabelText(/highlighted/i);
    expect(highlightedToggle).not.toBeChecked();
  });

  it("defaults requiresAccess to false for a new happening", () => {
    render(<HappeningForm {...defaultProps} />);

    const requiresAccessToggle = screen.getByLabelText(/requires access/i);
    expect(requiresAccessToggle).not.toBeChecked();
  });

  // ---- Calls onSubmit with form data ----

  it("calls onSubmit with form data on valid submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <HappeningForm
        {...defaultProps}
        onSubmit={onSubmit}
        defaultValues={{
          title: "Pre-filled Happening",
          startTime: new Date("2026-06-15T09:00:00"),
          endTime: new Date("2026-06-15T11:00:00"),
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
        title: "Pre-filled Happening",
      }),
    );
  });

  // ---- Null defaultValues are treated as empty ----

  it("handles null values in defaultValues gracefully", () => {
    render(
      <HappeningForm
        {...defaultProps}
        defaultValues={{
          title: "Happening",
          description: null,
          location: null,
          hostName: null,
        }}
      />,
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue("Happening");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
    expect(screen.getByLabelText(/location/i)).toHaveValue("");
    expect(screen.getByLabelText(/host name/i)).toHaveValue("");
  });
});
