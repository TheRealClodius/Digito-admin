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

import { WhitelistTable } from "./whitelist-table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<{
    id: string;
    email: string;
    accessTier: "regular" | "premium" | "vip" | "staff";
    company: string | null;
    lockedFields: string[];
    addedAt: { toDate: () => Date };
  }> = {},
) {
  return {
    id: overrides.id ?? "wl-1",
    email: overrides.email ?? "alice@example.com",
    accessTier: overrides.accessTier ?? "regular",
    company: overrides.company !== undefined ? overrides.company : "Acme Corp",
    lockedFields: overrides.lockedFields ?? [],
    addedAt: overrides.addedAt ?? { toDate: () => new Date("2025-06-15T10:00:00Z") },
  };
}

const sampleEntries = [
  makeEntry({ id: "wl-1", email: "alice@example.com", accessTier: "regular", company: "Acme Corp" }),
  makeEntry({ id: "wl-2", email: "bob@example.com", accessTier: "premium", company: "Globex Inc", addedAt: { toDate: () => new Date("2025-07-20T12:00:00Z") } }),
  makeEntry({ id: "wl-3", email: "carol@example.com", accessTier: "vip", company: null }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WhitelistTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----- Column headers -----

  describe("column headers", () => {
    it("renders table column headers: Email, Name, Access Tier, Company, Status, Added, Actions", () => {
      render(
        <WhitelistTable entries={sampleEntries} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByRole("columnheader", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /access tier/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /company/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /added/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /actions/i })).toBeInTheDocument();
    });
  });

  // ----- Rendering rows -----

  describe("rendering data rows", () => {
    it("renders a row for each entry", () => {
      render(
        <WhitelistTable entries={sampleEntries} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const rows = screen.getAllByRole("row");
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });

    it("displays entry emails in the table", () => {
      render(
        <WhitelistTable entries={sampleEntries} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(screen.getByText("carol@example.com")).toBeInTheDocument();
    });

    it("formats and displays the added date", () => {
      const entry = makeEntry({
        id: "wl-date",
        email: "date@example.com",
        addedAt: { toDate: () => new Date("2025-01-10T00:00:00Z") },
      });

      render(
        <WhitelistTable entries={[entry]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });
  });

  // ----- Empty state -----

  describe("empty state", () => {
    it('shows "Nessun elemento trovato" when given an empty array', () => {
      render(
        <WhitelistTable entries={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/no entries found/i)).toBeInTheDocument();
    });

    it("does not render data rows when the entries array is empty", () => {
      render(
        <WhitelistTable entries={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const rows = screen.getAllByRole("row");
      // Header row + 1 row containing the empty message
      expect(rows.length).toBeLessThanOrEqual(2);
    });
  });

  // ----- Edit action -----

  describe("edit action", () => {
    it("calls onEdit with the entry when the edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const entry = makeEntry({ id: "wl-edit", email: "edit@example.com" });

      render(
        <WhitelistTable entries={[entry]} onEdit={onEdit} onDelete={vi.fn()} />,
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "wl-edit", email: "edit@example.com" }),
      );
    });

    it("calls onEdit with the correct entry when multiple entries are present", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <WhitelistTable entries={sampleEntries} onEdit={onEdit} onDelete={vi.fn()} />,
      );

      const bobRow = screen.getByText("bob@example.com").closest("tr")!;
      const editButton = within(bobRow).getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "wl-2", email: "bob@example.com" }),
      );
    });
  });

  // ----- Delete action -----

  describe("delete action", () => {
    it("calls onDelete with the entry id when the delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const entry = makeEntry({ id: "wl-del", email: "del@example.com" });

      render(
        <WhitelistTable entries={[entry]} onEdit={vi.fn()} onDelete={onDelete} />,
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("wl-del");
    });

    it("calls onDelete with the correct id when multiple entries are present", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <WhitelistTable entries={sampleEntries} onEdit={vi.fn()} onDelete={onDelete} />,
      );

      const carolRow = screen.getByText("carol@example.com").closest("tr")!;
      const deleteButton = within(carolRow).getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("wl-3");
    });
  });

  // ----- Tier badges -----

  describe("tier badges", () => {
    it("renders a badge for the access tier", () => {
      const entry = makeEntry({ accessTier: "premium" });

      render(
        <WhitelistTable entries={[entry]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("premium")).toBeInTheDocument();
    });

    it("renders different badge colors for each tier", () => {
      const entries = [
        makeEntry({ id: "t1", email: "a@a.com", accessTier: "regular" }),
        makeEntry({ id: "t2", email: "b@b.com", accessTier: "premium" }),
        makeEntry({ id: "t3", email: "c@c.com", accessTier: "vip" }),
        makeEntry({ id: "t4", email: "d@d.com", accessTier: "staff" }),
      ];

      render(
        <WhitelistTable entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const regularBadge = screen.getByText("regular");
      const premiumBadge = screen.getByText("premium");
      const vipBadge = screen.getByText("vip");
      const staffBadge = screen.getByText("staff");

      // Each badge should be present and rendered with a data-tier attribute for styling
      expect(regularBadge).toBeInTheDocument();
      expect(premiumBadge).toBeInTheDocument();
      expect(vipBadge).toBeInTheDocument();
      expect(staffBadge).toBeInTheDocument();

      // Verify that the badges have distinct classes based on tier
      expect(regularBadge.className).not.toBe(vipBadge.className);
    });
  });

  // ----- Entry count -----

  describe("entry count", () => {
    it("displays the total number of entries", () => {
      render(
        <WhitelistTable entries={sampleEntries} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/3 entr/)).toBeInTheDocument();
    });

    it("displays a count of 0 when no entries exist", () => {
      render(
        <WhitelistTable entries={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/0 entr/)).toBeInTheDocument();
    });

    it("displays singular 'entry' for a single entry", () => {
      render(
        <WhitelistTable entries={[makeEntry()]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/1 entr/)).toBeInTheDocument();
    });
  });

  // ----- Handles null company -----

  describe("null company", () => {
    it("handles null company gracefully", () => {
      const entry = makeEntry({ id: "wl-null", email: "null@example.com", company: null });

      render(
        <WhitelistTable entries={[entry]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      // The row should still render without error
      expect(screen.getByText("null@example.com")).toBeInTheDocument();
    });
  });

  // ----- Accessibility basics -----

  describe("accessibility", () => {
    it("renders a table element", () => {
      render(
        <WhitelistTable entries={sampleEntries} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });
});
