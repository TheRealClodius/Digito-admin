import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventsTable } from "./events-table";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Firestore-style Timestamp stub from a Date. */
function ts(date: Date) {
  return { toDate: () => date };
}

/** Convenience factory for building event objects used in tests. */
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    clientId: "client-1",
    name: "Tech Conference 2026",
    description: "A great tech conference",
    venue: "Convention Center",
    startDate: ts(new Date("2026-06-15T09:00:00")),
    endDate: ts(new Date("2026-06-17T18:00:00")),
    isActive: true,
    logoUrl: null,
    bannerUrl: null,
    websiteUrl: "https://techconf.example.com",
    instagramUrl: null,
    chatPrompt: null,
    imageUrls: null,
    createdAt: ts(new Date("2026-01-01T00:00:00")),
    ...overrides,
  };
}

const defaultHandlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggleActive: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Column headers ----

  it("renders all expected column headers", () => {
    render(<EventsTable events={[makeEvent()]} {...defaultHandlers} />);

    expect(screen.getByText("Nome")).toBeInTheDocument();
    expect(screen.getByText("Venue")).toBeInTheDocument();
    expect(screen.getByText("Dates")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  // ---- Row data ----

  it("displays the event name and venue in each row", () => {
    const events = [
      makeEvent({ id: "evt-1", name: "Alpha Conf", venue: "Hall A" }),
      makeEvent({ id: "evt-2", name: "Beta Summit", venue: "Hall B" }),
    ];

    render(<EventsTable events={events} {...defaultHandlers} />);

    expect(screen.getByText("Alpha Conf")).toBeInTheDocument();
    expect(screen.getByText("Hall A")).toBeInTheDocument();
    expect(screen.getByText("Beta Summit")).toBeInTheDocument();
    expect(screen.getByText("Hall B")).toBeInTheDocument();
  });

  // ---- Empty state ----

  it('shows "Nessun evento trovato" when the events array is empty', () => {
    render(<EventsTable events={[]} {...defaultHandlers} />);

    expect(screen.getByText(/no events found/i)).toBeInTheDocument();
  });

  // ---- Date formatting ----

  it("formats dates nicely (e.g. 'Jan 15, 2026')", () => {
    const event = makeEvent({
      startDate: ts(new Date("2026-01-15T09:00:00")),
      endDate: ts(new Date("2026-01-17T18:00:00")),
    });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 17, 2026/)).toBeInTheDocument();
  });

  // ---- Status badge: Upcoming ----

  it('shows an "Upcoming" badge when now is before the start date', () => {
    const futureStart = new Date();
    futureStart.setFullYear(futureStart.getFullYear() + 1);
    const futureEnd = new Date(futureStart);
    futureEnd.setDate(futureEnd.getDate() + 2);

    const event = makeEvent({
      startDate: ts(futureStart),
      endDate: ts(futureEnd),
    });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  // ---- Status badge: Live ----

  it('shows a "Live" badge when now is between the start and end dates', () => {
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 1);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 1);

    const event = makeEvent({
      startDate: ts(pastStart),
      endDate: ts(futureEnd),
    });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  // ---- Status badge: Ended ----

  it('shows an "Ended" badge when now is after the end date', () => {
    const pastStart = new Date("2024-01-01T00:00:00");
    const pastEnd = new Date("2024-01-03T00:00:00");

    const event = makeEvent({
      startDate: ts(pastStart),
      endDate: ts(pastEnd),
    });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    expect(screen.getByText("Ended")).toBeInTheDocument();
  });

  // ---- Active toggle ----

  it("calls onToggleActive when the active switch is clicked", async () => {
    const user = userEvent.setup();
    const event = makeEvent({ id: "evt-toggle", isActive: true });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    expect(defaultHandlers.onToggleActive).toHaveBeenCalledWith(
      "evt-toggle",
      false,
    );
  });

  it("calls onToggleActive with true when toggling an inactive event", async () => {
    const user = userEvent.setup();
    const event = makeEvent({ id: "evt-inactive", isActive: false });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    expect(defaultHandlers.onToggleActive).toHaveBeenCalledWith(
      "evt-inactive",
      true,
    );
  });

  // ---- Edit button ----

  it("calls onEdit with the event when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const event = makeEvent({ id: "evt-edit" });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(defaultHandlers.onEdit).toHaveBeenCalledTimes(1);
    expect(defaultHandlers.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt-edit", name: "Tech Conference 2026" }),
    );
  });

  // ---- Delete button ----

  it("calls onDelete with the event id when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const event = makeEvent({ id: "evt-delete" });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(defaultHandlers.onDelete).toHaveBeenCalledTimes(1);
    expect(defaultHandlers.onDelete).toHaveBeenCalledWith("evt-delete");
  });

  // ---- Multiple rows ----

  it("renders the correct number of rows for multiple events", () => {
    const events = [
      makeEvent({ id: "1", name: "Event A" }),
      makeEvent({ id: "2", name: "Event B" }),
      makeEvent({ id: "3", name: "Event C" }),
    ];

    render(<EventsTable events={events} {...defaultHandlers} />);

    const rows = screen.getAllByRole("row");
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  // ---- Switch reflects isActive state ----

  it("renders the active switch as checked when event is active", () => {
    const event = makeEvent({ isActive: true });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeChecked();
  });

  it("renders the active switch as unchecked when event is inactive", () => {
    const event = makeEvent({ isActive: false });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).not.toBeChecked();
  });

  // ---- Null/missing venue ----

  it("handles null venue gracefully", () => {
    const event = makeEvent({ venue: null });

    render(<EventsTable events={[event]} {...defaultHandlers} />);

    // Should render without crashing; venue cell may show a dash or be empty
    expect(screen.getByText("Tech Conference 2026")).toBeInTheDocument();
  });
});
