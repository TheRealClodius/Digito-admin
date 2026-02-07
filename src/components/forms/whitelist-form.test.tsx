import { render, screen, waitFor } from "@testing-library/react";
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

import { WhitelistForm } from "./whitelist-form";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WhitelistForm", () => {
  // ----- Form field rendering -----

  describe("form fields", () => {
    it("renders an email input field", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders the email input as required", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeRequired();
    });

    it("renders an access tier select field", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/access tier/i)).toBeInTheDocument();
    });

    it("renders a company input field", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    });

    it("renders a locked fields input", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByLabelText(/locked fields/i)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: /save|submit|create/i })).toBeInTheDocument();
    });

    it("renders a cancel button", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // ----- Submit button disabled state -----

  describe("submit button disabled state", () => {
    it("disables the submit button when the email field is empty", () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables the submit button when the email field has a valid value", async () => {
      const user = userEvent.setup();

      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeEnabled();
    });

    it("disables the submit button again when the email is cleared", async () => {
      const user = userEvent.setup();

      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "test@example.com");
      await user.clear(emailInput);

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ----- Email validation -----

  describe("email validation", () => {
    it("shows a validation error for an invalid email address", async () => {
      const user = userEvent.setup();

      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "not-an-email");
      await user.tab(); // blur the field

      await waitFor(() => {
        expect(screen.getByText(/valid email|invalid email/i)).toBeInTheDocument();
      });
    });

    it("does not show a validation error for a valid email address", async () => {
      const user = userEvent.setup();

      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "valid@example.com");
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText(/valid email|invalid email/i)).not.toBeInTheDocument();
      });
    });
  });

  // ----- Access tier defaults to regular -----

  describe("access tier default", () => {
    it('defaults to "regular" when no defaultValues are provided', () => {
      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );

      const tierSelect = screen.getByLabelText(/access tier/i);
      expect(tierSelect).toHaveValue("regular");
    });
  });

  // ----- Pre-filling with defaultValues (edit mode) -----

  describe("edit mode with defaultValues", () => {
    it("pre-fills the email field with the default value", () => {
      render(
        <WhitelistForm
          defaultValues={{ email: "existing@example.com", accessTier: "premium" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue("existing@example.com");
    });

    it("pre-fills the access tier with the default value", () => {
      render(
        <WhitelistForm
          defaultValues={{ email: "user@test.com", accessTier: "vip" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const tierSelect = screen.getByLabelText(/access tier/i);
      expect(tierSelect).toHaveValue("vip");
    });

    it("pre-fills the company field with the default value", () => {
      render(
        <WhitelistForm
          defaultValues={{ email: "user@test.com", accessTier: "regular", company: "Test Co" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const companyInput = screen.getByLabelText(/company/i);
      expect(companyInput).toHaveValue("Test Co");
    });

    it("pre-fills locked fields as comma-separated string", () => {
      render(
        <WhitelistForm
          defaultValues={{
            email: "user@test.com",
            accessTier: "regular",
            lockedFields: ["email", "accessTier"],
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const lockedFieldsInput = screen.getByLabelText(/locked fields/i);
      expect(lockedFieldsInput).toHaveValue("email, accessTier");
    });

    it("enables the submit button when defaultValues includes an email", () => {
      render(
        <WhitelistForm
          defaultValues={{ email: "pre@example.com", accessTier: "regular" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeEnabled();
    });
  });

  // ----- Form submission -----

  describe("form submission", () => {
    it("calls onSubmit with form data when submitted with valid input", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WhitelistForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "new@example.com");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@example.com",
          accessTier: "regular",
        }),
      );
    });

    it("parses comma-separated locked fields on submit", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WhitelistForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "fields@example.com");

      const lockedFieldsInput = screen.getByLabelText(/locked fields/i);
      await user.type(lockedFieldsInput, "email, company, accessTier");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          lockedFields: ["email", "company", "accessTier"],
        }),
      );
    });

    it("does not call onSubmit when email is empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WhitelistForm onSubmit={onSubmit} onCancel={vi.fn()} />,
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Cancel button -----

  describe("cancel button", () => {
    it("calls onCancel when the cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <WhitelistForm onSubmit={vi.fn()} onCancel={onCancel} />,
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
        <WhitelistForm onSubmit={onSubmit} onCancel={onCancel} />,
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
        <WhitelistForm
          defaultValues={{ email: "user@test.com", accessTier: "regular" }}
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
        <WhitelistForm
          defaultValues={{ email: "user@test.com", accessTier: "regular" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />,
      );

      expect(screen.getByText(/saving|submitting|loading/i)).toBeInTheDocument();
    });

    it("does not show loading state when submitStatus is idle", () => {
      render(
        <WhitelistForm
          defaultValues={{ email: "user@test.com", accessTier: "regular" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="idle"
        />,
      );

      expect(screen.queryByText(/saving|submitting|loading/i)).not.toBeInTheDocument();
    });

    it("disables the cancel button when submitStatus is saving", () => {
      render(
        <WhitelistForm
          defaultValues={{ email: "user@test.com", accessTier: "regular" }}
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
