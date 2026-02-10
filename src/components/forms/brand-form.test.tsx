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

vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock next/image to avoid jsdom issues
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { BrandForm } from "./brand-form";

// ResizeObserver mock required by Radix Switch in jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BrandForm", () => {
  // ----- Form field rendering -----

  describe("form fields", () => {
    it("renders a name input field", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it("renders the name input as required", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeRequired();
    });

    it("renders a description textarea", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
      const descriptionField = screen.getByRole("textbox", { name: /description/i });
      expect(descriptionField.tagName.toLowerCase()).toBe("textarea");
    });

    it("renders a logo upload area", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText(/logo/i)).toBeInTheDocument();
    });

    it("renders an image upload area", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText(/image/i)).toBeInTheDocument();
    });

    it("renders a website URL input", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    });

    it("renders an instagram URL input", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/instagram url/i)).toBeInTheDocument();
    });

    it("renders a stall number input", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByLabelText(/stall number/i)).toBeInTheDocument();
    });

    it("renders a highlighted switch", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.getByText(/highlighted/i)).toBeInTheDocument();
    });

    it("renders a submit button", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /save|submit|create/i }),
      ).toBeInTheDocument();
    });

    it("renders a cancel button", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });
  });

  // ----- Submit button disabled state -----

  describe("submit button disabled state", () => {
    it("disables the submit button when the name field is empty", () => {
      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("enables the submit button when the name field has a value", async () => {
      const user = userEvent.setup();

      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "New Brand");

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      expect(submitButton).toBeEnabled();
    });

    it("disables the submit button again when the name is cleared", async () => {
      const user = userEvent.setup();

      render(<BrandForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Test");
      await user.clear(nameInput);

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  // ----- Form submission -----

  describe("form submission", () => {
    it("calls onSubmit with the form data when submitted with valid input", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<BrandForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "New Brand");

      const descriptionInput = screen.getByRole("textbox", { name: /description/i });
      await user.type(descriptionInput, "A great brand");

      const websiteInput = screen.getByLabelText(/website url/i);
      await user.type(websiteInput, "https://brand.com");

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Brand",
          description: "A great brand",
          websiteUrl: "https://brand.com",
        }),
      );
    });

    it("calls onSubmit with only name when other fields are left empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<BrandForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Minimal Brand");

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Minimal Brand",
        }),
      );
    });

    it("does not call onSubmit when name is empty", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<BrandForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Validation error -----

  describe("validation", () => {
    it("shows a validation error when the name field is empty and blurred", async () => {
      const user = userEvent.setup();

      render(
        <BrandForm
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          defaultValues={{ name: "" }}
        />,
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab(); // blur the field

      await waitFor(() => {
        expect(
          screen.getByText(/name is required|required/i),
        ).toBeInTheDocument();
      });
    });
  });

  // ----- Pre-filling with defaultValues (edit mode) -----

  describe("edit mode with defaultValues", () => {
    it("pre-fills the name field with the default value", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Existing Brand" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue("Existing Brand");
    });

    it("pre-fills the description field with the default value", () => {
      render(
        <BrandForm
          defaultValues={{
            name: "Brand",
            description: "Existing description",
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const descriptionInput = screen.getByRole("textbox", { name: /description/i });
      expect(descriptionInput).toHaveValue("Existing description");
    });

    it("handles null description in defaultValues", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Brand", description: null }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const descriptionInput = screen.getByRole("textbox", { name: /description/i });
      expect(descriptionInput).toHaveValue("");
    });

    it("pre-fills the website URL field", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Brand", websiteUrl: "https://example.com" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const websiteInput = screen.getByLabelText(/website url/i);
      expect(websiteInput).toHaveValue("https://example.com");
    });

    it("pre-fills the instagram URL field", () => {
      render(
        <BrandForm
          defaultValues={{
            name: "Brand",
            instagramUrl: "https://instagram.com/brand",
          }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const instagramInput = screen.getByLabelText(/instagram url/i);
      expect(instagramInput).toHaveValue("https://instagram.com/brand");
    });

    it("pre-fills the stall number field", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Brand", stallNumber: "C5" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const stallInput = screen.getByLabelText(/stall number/i);
      expect(stallInput).toHaveValue("C5");
    });

    it("pre-fills the highlighted switch as checked", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Brand", isHighlighted: true }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("data-state", "checked");
    });

    it("enables the submit button when defaultValues includes a name", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Pre-filled" }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      expect(submitButton).toBeEnabled();
    });

    it("submits the updated data after editing pre-filled values", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <BrandForm
          defaultValues={{
            name: "Old Name",
            description: "Old description",
          }}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Name");

      const submitButton = screen.getByRole("button", {
        name: /save|submit|create/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
        }),
      );
    });
  });

  // ----- Cancel button -----

  describe("cancel button", () => {
    it("calls onCancel when the cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<BrandForm onSubmit={vi.fn()} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("does not call onSubmit when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<BrandForm onSubmit={onSubmit} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ----- Loading / submitting state -----

  describe("loading state", () => {
    it("disables the submit button when submitStatus is saving", () => {
      render(
        <BrandForm
          defaultValues={{ name: "Brand" }}
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
        <BrandForm
          defaultValues={{ name: "Brand" }}
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
        <BrandForm
          defaultValues={{ name: "Brand" }}
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
        <BrandForm
          defaultValues={{ name: "Brand" }}
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
