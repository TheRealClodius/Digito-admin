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

import { ClientForm } from "./client-form";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ClientForm", () => {
  // ----- Form field rendering -----

  describe("form fields", () => {
    it("renders a name input field", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it("renders the name input as required", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeRequired();
    });

    it("renders a description textarea", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      // Verify it is a textarea element
      const descriptionField = screen.getByLabelText(/description/i);
      expect(descriptionField.tagName.toLowerCase()).toBe("textarea");
    });

    it("renders a logo upload area", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByText(/logo/i)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByRole("button", { name: /save|submit|create/i })).toBeInTheDocument();
    });

    it("renders a cancel button", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  // ----- Submit button disabled state -----

  describe("submit button disabled state", () => {
    it("disables the submit button when the name field is empty", () => {
      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables the submit button when the name field has a value", async () => {
      const user = userEvent.setup();

      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "New Client");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeEnabled();
    });

    it("disables the submit button again when the name is cleared", async () => {
      const user = userEvent.setup();

      render(
        <ClientForm onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Test");
      await user.clear(nameInput);

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
        <ClientForm onSubmit={onSubmit} onCancel={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "New Client");

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "A great client");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Client",
          description: "A great client",
        })
      );
    });

    it("calls onSubmit with only name when description is left empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ClientForm onSubmit={onSubmit} onCancel={vi.fn()} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Minimal Client");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Minimal Client",
        })
      );
    });

    it("does not call onSubmit when name is empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ClientForm onSubmit={onSubmit} onCancel={vi.fn()} />
      );

      // The submit button should be disabled, but let's also try submitting the form directly
      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      // Button is disabled so click should not trigger submit
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Validation error -----

  describe("validation", () => {
    it("shows a validation error when the name field is empty and form submission is attempted", async () => {
      const user = userEvent.setup();

      render(
        <ClientForm
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          defaultValues={{ name: "" }}
        />
      );

      // Try to find and interact with a way to trigger validation.
      // Even though button is disabled, let's check that there's a required indication
      // or if the field is touched/blurred, a validation message appears.
      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab(); // blur the field

      await waitFor(() => {
        expect(screen.getByText(/name is required|required/i)).toBeInTheDocument();
      });
    });
  });

  // ----- Pre-filling with defaultValues (edit mode) -----

  describe("edit mode with defaultValues", () => {
    it("pre-fills the name field with the default value", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Existing Client" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue("Existing Client");
    });

    it("pre-fills the description field with the default value", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Client", description: "Existing description" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveValue("Existing description");
    });

    it("handles null description in defaultValues", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Client", description: null }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveValue("");
    });

    it("enables the submit button when defaultValues includes a name", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Pre-filled" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      expect(submitButton).toBeEnabled();
    });

    it("submits the updated data after editing pre-filled values", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <ClientForm
          defaultValues={{ name: "Old Name", description: "Old description" }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Name");

      const submitButton = screen.getByRole("button", { name: /save|submit|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
        })
      );
    });
  });

  // ----- Cancel button -----

  describe("cancel button", () => {
    it("calls onCancel when the cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <ClientForm onSubmit={vi.fn()} onCancel={onCancel} />
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
        <ClientForm onSubmit={onSubmit} onCancel={onCancel} />
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
        <ClientForm
          defaultValues={{ name: "Client" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />
      );

      const submitButton = screen.getByRole("button", { name: /save|submit|create|saving|submitting/i });
      expect(submitButton).toBeDisabled();
    });

    it("shows a loading indicator on the submit button when submitStatus is saving", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Client" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />
      );

      // The button text should indicate loading (e.g., "Saving..." or contain a spinner)
      expect(screen.getByText(/saving|submitting|loading/i)).toBeInTheDocument();
    });

    it("does not show loading state when submitStatus is idle", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Client" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="idle"
        />
      );

      expect(screen.queryByText(/saving|submitting|loading/i)).not.toBeInTheDocument();
    });

    it("disables the cancel button when submitStatus is saving", () => {
      render(
        <ClientForm
          defaultValues={{ name: "Client" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });
});
