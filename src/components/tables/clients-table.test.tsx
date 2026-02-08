import { render, screen, within } from "@testing-library/react";
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

import { ClientsTable } from "./clients-table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(overrides: Partial<{
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: { toDate: () => Date };
}> = {}) {
  return {
    id: overrides.id ?? "client-1",
    name: overrides.name ?? "Acme Corp",
    description: overrides.description !== undefined ? overrides.description : "A test client",
    logoUrl: overrides.logoUrl !== undefined ? overrides.logoUrl : null,
    createdAt: overrides.createdAt ?? { toDate: () => new Date("2025-06-15T10:00:00Z") },
  };
}

const sampleClients = [
  makeClient({ id: "c1", name: "Acme Corp", description: "First client" }),
  makeClient({ id: "c2", name: "Globex Inc", description: "Second client", createdAt: { toDate: () => new Date("2025-07-20T12:00:00Z") } }),
  makeClient({ id: "c3", name: "Initech", description: null }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ClientsTable", () => {
  // ----- Column headers -----

  describe("column headers", () => {
    it("renders table column headers: Name, Description, Created, Actions", () => {
      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /description/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /created/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /actions/i })).toBeInTheDocument();
    });
  });

  // ----- Rendering rows -----

  describe("rendering client rows", () => {
    it("renders a row for each client", () => {
      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      // Table body rows (excluding the header row)
      const rows = screen.getAllByRole("row");
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });

    it("displays client names in the table", () => {
      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Globex Inc")).toBeInTheDocument();
      expect(screen.getByText("Initech")).toBeInTheDocument();
    });

    it("displays client descriptions in the table", () => {
      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText("First client")).toBeInTheDocument();
      expect(screen.getByText("Second client")).toBeInTheDocument();
    });

    it("handles null or missing descriptions gracefully", () => {
      const client = makeClient({ id: "c-null", name: "No Desc", description: null });

      render(
        <ClientsTable clients={[client]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      // The row should still render without error
      expect(screen.getByText("No Desc")).toBeInTheDocument();
    });

    it("formats and displays the created date", () => {
      const client = makeClient({
        id: "c-date",
        name: "Date Test",
        createdAt: { toDate: () => new Date("2025-01-10T00:00:00Z") },
      });

      render(
        <ClientsTable clients={[client]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      // The component should render the date in some human-readable format.
      // We check that the year and some part of the date appear (in multiple places).
      expect(screen.getAllByText(/2025/).length).toBeGreaterThan(0);
    });

    it("displays the created date as visible text in the Created column cell", () => {
      const client = makeClient({
        id: "c-date-visible",
        name: "Date Visible Test",
        createdAt: { toDate: () => new Date("2025-01-10T00:00:00Z") },
      });

      render(
        <ClientsTable clients={[client]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      // Find the row for this client
      const row = screen.getByText("Date Visible Test").closest("tr")!;
      const cells = within(row).getAllByRole("cell");

      // The Created column is the 3rd column (index 2)
      const createdCell = cells[2];

      // The date text should be visible in the cell, not just in a title attribute
      expect(createdCell).toHaveTextContent(/Jan 10, 2025/);
    });
  });

  // ----- Empty state -----

  describe("empty state", () => {
    it('shows "No clients found" when given an empty array', () => {
      render(
        <ClientsTable clients={[]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    });

    it("does not render data rows when the clients array is empty", () => {
      render(
        <ClientsTable clients={[]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      // Only the header row should be present (or no rows at all besides the empty message)
      const rows = screen.getAllByRole("row");
      // Header row + 1 row containing the empty message
      expect(rows.length).toBeLessThanOrEqual(2);
    });
  });

  // ----- Description truncation -----

  describe("description truncation", () => {
    it("truncates long descriptions", () => {
      const longDescription = "A".repeat(200);
      const client = makeClient({
        id: "c-long",
        name: "Long Desc Client",
        description: longDescription,
      });

      render(
        <ClientsTable clients={[client]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      // The full 200-character string should NOT appear verbatim
      const descriptionCell = screen.queryByText(longDescription);
      expect(descriptionCell).not.toBeInTheDocument();

      // But some truncated version of it should be present
      expect(screen.getByText(/A{2,}/)).toBeInTheDocument();
    });
  });

  // ----- Edit action -----

  describe("edit action", () => {
    it("calls onEdit with the client when the edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const client = makeClient({ id: "c-edit", name: "Editable Client" });

      render(
        <ClientsTable clients={[client]} onEdit={onEdit} onDelete={vi.fn()} />
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "c-edit", name: "Editable Client" })
      );
    });

    it("calls onEdit with the correct client when multiple clients are present", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <ClientsTable clients={sampleClients} onEdit={onEdit} onDelete={vi.fn()} />
      );

      // Find the row containing "Globex Inc" and click its edit button
      const globexRow = screen.getByText("Globex Inc").closest("tr")!;
      const editButton = within(globexRow).getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "c2", name: "Globex Inc" })
      );
    });
  });

  // ----- Delete action -----

  describe("delete action", () => {
    it("calls onDelete with the client id when the delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const client = makeClient({ id: "c-del", name: "Deletable Client" });

      render(
        <ClientsTable clients={[client]} onEdit={vi.fn()} onDelete={onDelete} />
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("c-del");
    });

    it("calls onDelete with the correct id when multiple clients are present", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={onDelete} />
      );

      const initechRow = screen.getByText("Initech").closest("tr")!;
      const deleteButton = within(initechRow).getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("c3");
    });
  });

  // ----- Client count -----

  describe("client count", () => {
    it("displays the total number of clients", () => {
      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText(/3 client/)).toBeInTheDocument();
    });

    it("displays a count of 0 when no clients exist", () => {
      render(
        <ClientsTable clients={[]} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText(/0 client/)).toBeInTheDocument();
    });

    it("updates count when a different number of clients is provided", () => {
      const twoClients = sampleClients.slice(0, 2);

      render(
        <ClientsTable clients={twoClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByText(/2 client/)).toBeInTheDocument();
    });
  });

  // ----- Accessibility basics -----

  describe("accessibility", () => {
    it("renders a table element", () => {
      render(
        <ClientsTable clients={sampleClients} onEdit={vi.fn()} onDelete={vi.fn()} />
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });
});
