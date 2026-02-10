import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionForm } from "./session-form";

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

// ResizeObserver mock required by Radix UI primitives in jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
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

describe("SessionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Renders expected fields ----

  it("renders the Title field", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("renders the Description field", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
  });

  it("renders Start Time and End Time fields", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it("renders the Location field", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
  });

  it("renders the Type select", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  it("renders Speaker Name and Speaker Bio fields", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByLabelText(/speaker name/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /speaker bio/i })).toBeInTheDocument();
  });

  it("renders the Requires Registration and Requires VIP Access checkboxes", () => {
    render(<SessionForm {...defaultProps} />);

    expect(screen.getByLabelText(/requires registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requires vip access/i)).toBeInTheDocument();
  });

  // ---- Submit and Cancel buttons ----

  it("renders a submit button and a cancel button", () => {
    render(<SessionForm {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /save|submit|create/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });

  // ---- Submit disabled when title empty ----

  it("submit button is disabled when the title field is empty", () => {
    render(<SessionForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });
    expect(submitButton).toBeDisabled();
  });

  // ---- Validation: title required ----

  it("shows a validation error when submitting with an empty title", async () => {
    const user = userEvent.setup();
    render(<SessionForm {...defaultProps} />);

    const titleField = screen.getByLabelText(/title/i);
    await user.click(titleField);
    await user.tab(); // blur

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  // ---- Validation: dates required ----

  it("shows validation errors when dates are missing on submit", async () => {
    const user = userEvent.setup();
    render(<SessionForm {...defaultProps} />);

    // Fill in title so it passes that validation
    const titleField = screen.getByLabelText(/title/i);
    await user.type(titleField, "My Session");

    // Attempt to submit
    const submitButton = screen.getByRole("button", {
      name: /save|submit|create/i,
    });

    if (!submitButton.hasAttribute("disabled")) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/start time is required/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/end time is required/i),
      ).toBeInTheDocument();
    });
  });

  // ---- Pre-fills form in edit mode ----

  it("pre-fills form fields when defaultValues are provided (edit mode)", () => {
    render(
      <SessionForm
        {...defaultProps}
        defaultValues={{
          title: "Existing Session",
          description: "Some description",
          location: "Grand Hall",
          speakerName: "Alice",
          speakerBio: "Expert in testing",
          type: "workshop",
          requiresRegistration: false,
          requiresVIPAccess: false,
        }}
      />,
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Session");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue(
      "Some description",
    );
    expect(screen.getByLabelText(/location/i)).toHaveValue("Grand Hall");
    expect(screen.getByLabelText(/speaker name/i)).toHaveValue("Alice");
    expect(screen.getByRole("textbox", { name: /speaker bio/i })).toHaveValue(
      "Expert in testing",
    );
    expect(screen.getByLabelText(/type/i)).toHaveValue("workshop");
  });

  // ---- Cancel button calls onCancel ----

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<SessionForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ---- submitStatus disables the submit button ----

  it("disables the submit button when submitStatus is saving", () => {
    render(
      <SessionForm
        {...defaultProps}
        submitStatus="saving"
        defaultValues={{
          title: "Some Session",
          startTime: new Date("2026-06-15T09:00:00"),
          endTime: new Date("2026-06-15T10:00:00"),
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

    render(<SessionForm {...defaultProps} onSubmit={onSubmit} />);

    const titleField = screen.getByLabelText(/title/i);
    await user.click(titleField);
    await user.tab();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // ---- Type select options ----

  it("allows selecting different session types", () => {
    render(<SessionForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/type/i);
    expect(typeSelect).toBeInTheDocument();

    // Verify all options exist
    const options = typeSelect.querySelectorAll("option");
    const optionValues = Array.from(options).map((o) =>
      (o as HTMLOptionElement).value,
    );
    expect(optionValues).toContain("talk");
    expect(optionValues).toContain("workshop");
    expect(optionValues).toContain("panel");
    expect(optionValues).toContain("networking");
    expect(optionValues).toContain("other");
  });

  // ---- Checkboxes reflect default values ----

  it("pre-fills requiresRegistration when defaultValues has it true", () => {
    render(
      <SessionForm
        {...defaultProps}
        defaultValues={{ requiresRegistration: true }}
      />,
    );

    expect(screen.getByLabelText(/requires registration/i)).toBeChecked();
  });

  it("pre-fills requiresVIPAccess when defaultValues has it true", () => {
    render(
      <SessionForm
        {...defaultProps}
        defaultValues={{ requiresVIPAccess: true }}
      />,
    );

    expect(screen.getByLabelText(/requires vip access/i)).toBeChecked();
  });

  // ---- Calls onSubmit with form data on valid submission ----

  it("calls onSubmit with form data on valid submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <SessionForm
        {...defaultProps}
        onSubmit={onSubmit}
        defaultValues={{
          title: "Pre-filled Session",
          startTime: new Date("2026-06-15T09:00:00"),
          endTime: new Date("2026-06-15T10:00:00"),
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
        title: "Pre-filled Session",
      }),
    );
  });

  // ---- Null defaultValues are treated as empty ----

  it("handles null values in defaultValues gracefully", () => {
    render(
      <SessionForm
        {...defaultProps}
        defaultValues={{
          title: "Session",
          description: null,
          location: null,
          speakerName: null,
          speakerBio: null,
        }}
      />,
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue("Session");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("");
    expect(screen.getByLabelText(/location/i)).toHaveValue("");
    expect(screen.getByLabelText(/speaker name/i)).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /speaker bio/i })).toHaveValue("");
  });
});
