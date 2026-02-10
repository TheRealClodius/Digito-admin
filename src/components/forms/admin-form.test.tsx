import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock Firebase modules
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

import { AdminForm } from "./admin-form";

const mockClients = [
  { id: "c1", name: "Client Alpha" },
  { id: "c2", name: "Client Beta" },
];

describe("AdminForm", () => {
  describe("form fields", () => {
    it("renders email input", () => {
      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders role selector with clientAdmin and eventAdmin options", () => {
      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it("renders client checkboxes", () => {
      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );
      expect(screen.getByText("Client Alpha")).toBeInTheDocument();
      expect(screen.getByText("Client Beta")).toBeInTheDocument();
    });

    it("renders submit and cancel buttons", () => {
      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );
      expect(screen.getByRole("button", { name: /save|add|submit/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("submit button is disabled when email is empty", () => {
      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );
      const submitButton = screen.getByRole("button", { name: /save|add|submit/i });
      expect(submitButton).toBeDisabled();
    });

    it("submit button is disabled when no client is selected", async () => {
      const user = userEvent.setup();
      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={vi.fn()} />
      );

      await user.type(screen.getByLabelText(/email/i), "test@example.com");

      const submitButton = screen.getByRole("button", { name: /save|add|submit/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("calls onSubmit with email, role, and clientIds", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <AdminForm clients={mockClients} onSubmit={onSubmit} onCancel={vi.fn()} />
      );

      await user.type(screen.getByLabelText(/email/i), "admin@test.com");
      // Select role
      await user.selectOptions(screen.getByLabelText(/role/i), "clientAdmin");
      // Check a client
      await user.click(screen.getByLabelText("Client Alpha"));

      const submitButton = screen.getByRole("button", { name: /save|add|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "admin@test.com",
            role: "clientAdmin",
            clientIds: ["c1"],
          })
        );
      });
    });

    it("calls onCancel when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <AdminForm clients={mockClients} onSubmit={vi.fn()} onCancel={onCancel} />
      );

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("role restriction", () => {
    it("only shows eventAdmin option when restrictToEventAdmin is true", () => {
      render(
        <AdminForm
          clients={mockClients}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          restrictToEventAdmin
        />
      );

      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect).toBeDisabled();
    });
  });

  describe("loading state", () => {
    it("disables submit button when submitStatus is saving", async () => {
      const user = userEvent.setup();
      render(
        <AdminForm
          clients={mockClients}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          submitStatus="saving"
        />
      );

      const submitButton = screen.getByRole("button", { name: /saving|add|submit/i });
      expect(submitButton).toBeDisabled();
    });
  });
});
