import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

// Wrap render to include TooltipProvider
function render(ui: React.ReactElement, options = {}) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>, options);
}
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

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

// ResizeObserver mock (needed by Radix UI primitives in jsdom)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import { ParticipantForm } from "./participant-form";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ParticipantForm", () => {
  // ----- Form field rendering -----

  describe("form fields", () => {
    it("renders a First Name input field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    it("renders the First Name input as required", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toBeRequired();
    });

    it("renders a Last Name input field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it("renders the Last Name input as required", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const lastNameInput = screen.getByLabelText(/last name/i);
      expect(lastNameInput).toBeRequired();
    });

    it("renders an Email input field as required", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toBeRequired();
    });

    it("renders an Access Tier select field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/access tier/i)).toBeInTheDocument();
    });

    it("renders a Locked Fields input", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/locked fields/i)).toBeInTheDocument();
    });

    it("renders a Role select field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it("renders a Company input field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    });

    it("renders a Title input field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it("renders a Bio textarea", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const bioField = screen.getByRole("textbox", { name: /bio/i });
      expect(bioField).toBeInTheDocument();
    });

    it("renders an Avatar upload area", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByText(/avatar/i)).toBeInTheDocument();
    });

    it("renders a Website URL input field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    });

    it("renders a LinkedIn URL input field", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/linkedin url/i)).toBeInTheDocument();
    });

    it("renders an Is Highlighted switch", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/highlighted/i)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: /save|submit|create/i })).toBeInTheDocument();
    });

    it("renders a cancel button", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // ----- Submit button disabled state -----

  describe("submit button disabled state", () => {
    it("disables the submit button when both first name and last name are empty", () => {
      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables the submit button when only first name is filled", async () => {
      const user = userEvent.setup();

      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, "Jane");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables the submit button when only last name is filled", async () => {
      const user = userEvent.setup();

      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(lastNameInput, "Doe");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables the submit button when both first name and last name have values", async () => {
      const user = userEvent.setup();

      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(firstNameInput, "Jane");
      await user.type(lastNameInput, "Doe");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeEnabled();
    });

    it("disables the submit button again when first name is cleared", async () => {
      const user = userEvent.setup();

      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(firstNameInput, "Jane");
      await user.type(lastNameInput, "Doe");
      await user.clear(firstNameInput);

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ----- Form submission -----

  describe("form submission", () => {
    it("calls onSubmit with the form data when submitted with valid input", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ParticipantForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      await user.type(screen.getByLabelText(/first name/i), "Jane");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "jane@example.com");
      await user.type(screen.getByLabelText(/company/i), "Acme Corp");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          company: "Acme Corp",
        }),
      );
    });

    it("calls onSubmit with only required fields when optional fields are left empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ParticipantForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      await user.type(screen.getByLabelText(/first name/i), "Minimal");
      await user.type(screen.getByLabelText(/last name/i), "Participant");
      await user.type(screen.getByLabelText(/email/i), "minimal@test.com");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Minimal",
          lastName: "Participant",
          email: "minimal@test.com",
        }),
      );
    });

    it("does not call onSubmit when required fields are empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ParticipantForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      // Button is disabled so click should not trigger submit
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Validation error -----

  describe("validation", () => {
    it("shows a validation error when first name is empty and field is blurred", async () => {
      const user = userEvent.setup();

      render(
        <ParticipantForm
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          defaultValues={{ firstName: "", lastName: "Doe" }}
        />,
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.click(firstNameInput);
      await user.tab(); // blur the field

      await waitFor(() => {
        expect(screen.getByText(/first name is required|required/i)).toBeInTheDocument();
      });
    });

    it("shows a validation error when last name is empty and field is blurred", async () => {
      const user = userEvent.setup();

      render(
        <ParticipantForm
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          defaultValues={{ firstName: "Jane", lastName: "" }}
        />,
      );

      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.click(lastNameInput);
      await user.tab(); // blur the field

      await waitFor(() => {
        expect(screen.getByText(/last name is required|required/i)).toBeInTheDocument();
      });
    });
  });

  // ----- Pre-filling with defaultValues (edit mode) -----

  describe("edit mode with defaultValues", () => {
    it("pre-fills the first name field with the default value", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Existing", lastName: "Person" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText(/first name/i)).toHaveValue("Existing");
    });

    it("pre-fills the last name field with the default value", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Jane", lastName: "Smith" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText(/last name/i)).toHaveValue("Smith");
    });

    it("pre-fills optional fields with default values", () => {
      render(
        <ParticipantForm
          defaultValues={{
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
            company: "Acme Corp",
            title: "CTO",
            bio: "A short bio",
            websiteUrl: "https://jane.dev",
            linkedinUrl: "https://linkedin.com/in/jane",
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText(/email/i)).toHaveValue("jane@example.com");
      expect(screen.getByLabelText(/company/i)).toHaveValue("Acme Corp");
      expect(screen.getByLabelText(/title/i)).toHaveValue("CTO");
      expect(screen.getByRole("textbox", { name: /bio/i })).toHaveValue("A short bio");
      expect(screen.getByLabelText(/website url/i)).toHaveValue("https://jane.dev");
      expect(screen.getByLabelText(/linkedin url/i)).toHaveValue("https://linkedin.com/in/jane");
    });

    it("handles null optional fields in defaultValues", () => {
      render(
        <ParticipantForm
          defaultValues={{
            firstName: "Jane",
            lastName: "Doe",
            email: null,
            company: null,
            title: null,
            bio: null,
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText(/email/i)).toHaveValue("");
      expect(screen.getByLabelText(/company/i)).toHaveValue("");
      expect(screen.getByLabelText(/title/i)).toHaveValue("");
      expect(screen.getByRole("textbox", { name: /bio/i })).toHaveValue("");
    });

    it("enables the submit button when defaultValues includes first and last name", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Pre-filled", lastName: "Nome" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeEnabled();
    });

    it("submits the updated data after editing pre-filled values", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ParticipantForm
          defaultValues={{ firstName: "Old", lastName: "Nome", email: "old@test.com" }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Updated");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Updated",
          lastName: "Nome",
        }),
      );
    });
  });

  // ----- Cancel button -----

  describe("cancel button", () => {
    it("calls onCancel when the cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <ParticipantForm onSubmit={vi.fn()} onCancel={onCancel} />,
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("does not call onSubmit when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParticipantForm onSubmit={onSubmit} onCancel={onCancel} />,
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Loading / submitting state -----

  describe("loading state", () => {
    it("disables the submit button when submitStatus is saving", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Jane", lastName: "Doe" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create|saving|submitting/i });
      expect(submitButton).toBeDisabled();
    });

    it("shows a loading indicator on the submit button when submitStatus is saving", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Jane", lastName: "Doe" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />,
      );

      expect(screen.getByText(/saving|submitting|loading/i)).toBeInTheDocument();
    });

    it("does not show loading state when submitStatus is idle", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Jane", lastName: "Doe" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="idle"
        />,
      );

      expect(screen.queryByText(/saving|submitting|loading/i)).not.toBeInTheDocument();
    });

    it("disables the cancel button when submitStatus is saving", () => {
      render(
        <ParticipantForm
          defaultValues={{ firstName: "Jane", lastName: "Doe" }}
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
