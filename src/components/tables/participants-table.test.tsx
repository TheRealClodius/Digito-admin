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

// ResizeObserver mock (needed by Radix UI primitives in jsdom)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import { ParticipantsTable } from "./participants-table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParticipant(
  overrides: Partial<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    company: string | null;
    title: string | null;
    bio: string | null;
    avatarUrl: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    brandId: string | null;
    sessionIds: string[];
    happeningIds: string[];
    isHighlighted: boolean;
    accessTier: string;
    lockedFields: string[];
    createdAt: { toDate: () => Date };
    addedAt: { toDate: () => Date };
  }> = {},
) {
  return {
    id: overrides.id ?? "p-1",
    firstName: overrides.firstName ?? "Jane",
    lastName: overrides.lastName ?? "Doe",
    email: overrides.email ?? "jane@example.com",
    role: overrides.role ?? "speaker",
    company: overrides.company !== undefined ? overrides.company : "Acme Corp",
    title: overrides.title !== undefined ? overrides.title : "CTO",
    bio: overrides.bio !== undefined ? overrides.bio : null,
    avatarUrl: overrides.avatarUrl !== undefined ? overrides.avatarUrl : null,
    websiteUrl: overrides.websiteUrl !== undefined ? overrides.websiteUrl : null,
    linkedinUrl: overrides.linkedinUrl !== undefined ? overrides.linkedinUrl : null,
    brandId: overrides.brandId !== undefined ? overrides.brandId : null,
    sessionIds: overrides.sessionIds ?? [],
    happeningIds: overrides.happeningIds ?? [],
    isHighlighted: overrides.isHighlighted ?? false,
    accessTier: overrides.accessTier ?? "regular",
    lockedFields: overrides.lockedFields ?? [],
    createdAt: overrides.createdAt ?? { toDate: () => new Date("2025-06-15T10:00:00Z") },
    addedAt: overrides.addedAt ?? { toDate: () => new Date("2025-06-15T10:00:00Z") },
  };
}

const sampleParticipants = [
  makeParticipant({ id: "p1", firstName: "Jane", lastName: "Doe", role: "speaker", company: "Acme Corp", email: "jane@acme.com", accessTier: "regular" }),
  makeParticipant({ id: "p2", firstName: "John", lastName: "Smith", role: "panelist", company: "Globex Inc", email: "john@globex.com", isHighlighted: true, accessTier: "vip" }),
  makeParticipant({ id: "p3", firstName: "Alice", lastName: "Wong", role: "host", company: null, email: "alice@example.com" }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ParticipantsTable", () => {
  // ----- Column headers -----

  describe("column headers", () => {
    it("renders table column headers: Name, Role, Company, Email, Access Tier, Highlighted, Actions", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /role/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /company/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /access tier/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /highlighted/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /actions/i })).toBeInTheDocument();
    });
  });

  // ----- Rendering rows -----

  describe("rendering participant rows", () => {
    it("renders a row for each participant", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const rows = screen.getAllByRole("row");
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });

    it("displays the full name (firstName + lastName) in the table", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("John Smith")).toBeInTheDocument();
      expect(screen.getByText("Alice Wong")).toBeInTheDocument();
    });

    it("displays the participant role as a badge", () => {
      const participant = makeParticipant({ id: "p-badge", role: "moderator" });

      render(
        <ParticipantsTable participants={[participant]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("moderator")).toBeInTheDocument();
    });

    it("displays participant company in the table", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Globex Inc")).toBeInTheDocument();
    });

    it("displays participant email in the table", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("jane@acme.com")).toBeInTheDocument();
      expect(screen.getByText("john@globex.com")).toBeInTheDocument();
    });

    it("displays participant access tier as a badge", () => {
      const participant = makeParticipant({ id: "p-tier", firstName: "VIP", lastName: "User", accessTier: "vip" });

      render(
        <ParticipantsTable participants={[participant]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("vip")).toBeInTheDocument();
    });

    it("handles null company gracefully", () => {
      const participant = makeParticipant({ id: "p-null-co", firstName: "No", lastName: "Azienda", company: null });

      render(
        <ParticipantsTable participants={[participant]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText("No Azienda")).toBeInTheDocument();
    });
  });

  // ----- Empty state -----

  describe("empty state", () => {
    it('shows "Nessun partecipante trovato" when given an empty array', () => {
      render(
        <ParticipantsTable participants={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/no participants found/i)).toBeInTheDocument();
    });

    it("does not render data rows when the participants array is empty", () => {
      render(
        <ParticipantsTable participants={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const rows = screen.getAllByRole("row");
      // Header row + 1 row containing the empty message
      expect(rows.length).toBeLessThanOrEqual(2);
    });
  });

  // ----- Edit action -----

  describe("edit action", () => {
    it("calls onEdit with the participant when the edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const participant = makeParticipant({ id: "p-edit", firstName: "Editable", lastName: "User" });

      render(
        <ParticipantsTable participants={[participant]} onEdit={onEdit} onDelete={vi.fn()} />,
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-edit", firstName: "Editable" }),
      );
    });

    it("calls onEdit with the correct participant when multiple participants are present", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={onEdit} onDelete={vi.fn()} />,
      );

      const johnRow = screen.getByText("John Smith").closest("tr")!;
      const editButton = within(johnRow).getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p2", firstName: "John" }),
      );
    });
  });

  // ----- Delete action -----

  describe("delete action", () => {
    it("calls onDelete with the participant id when the delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const participant = makeParticipant({ id: "p-del", firstName: "Deletable", lastName: "User" });

      render(
        <ParticipantsTable participants={[participant]} onEdit={vi.fn()} onDelete={onDelete} />,
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("p-del");
    });

    it("calls onDelete with the correct id when multiple participants are present", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={onDelete} />,
      );

      const aliceRow = screen.getByText("Alice Wong").closest("tr")!;
      const deleteButton = within(aliceRow).getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("p3");
    });
  });

  // ----- Participant count -----

  describe("participant count", () => {
    it("displays the total number of participants", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/3 participant/)).toBeInTheDocument();
    });

    it("displays a count of 0 when no participants exist", () => {
      render(
        <ParticipantsTable participants={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/0 participant/)).toBeInTheDocument();
    });

    it("updates count when a different number of participants is provided", () => {
      const twoParticipants = sampleParticipants.slice(0, 2);

      render(
        <ParticipantsTable participants={twoParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/2 participant/)).toBeInTheDocument();
    });
  });

  // ----- Role badge -----

  describe("role badge", () => {
    it("renders role as a badge element", () => {
      const participant = makeParticipant({ id: "p-role", role: "performer" });

      render(
        <ParticipantsTable participants={[participant]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const badge = screen.getByText("performer");
      expect(badge).toBeInTheDocument();
    });
  });

  // ----- Accessibility basics -----

  describe("accessibility", () => {
    it("renders a table element", () => {
      render(
        <ParticipantsTable participants={sampleParticipants} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });
});
