import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionsTable } from "./sessions-table";

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

/** Create a Firestore-style Timestamp stub from a Date. */
function ts(date: Date) {
  return { toDate: () => date };
}

/** Convenience factory for building session objects used in tests. */
function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    title: "Intro to TypeScript",
    description: "Learn the basics of TypeScript",
    startTime: ts(new Date("2026-06-15T09:00:00")),
    endTime: ts(new Date("2026-06-15T10:00:00")),
    location: "Room A",
    type: "talk",
    speakerName: "Jane Doe",
    speakerBio: "Senior Engineer",
    speakerAvatarUrl: null,
    participantId: null,
    requiresAccess: false,
    accessTier: null,
    imageUrl: null,
    createdAt: ts(new Date("2026-01-01T00:00:00")),
    ...overrides,
  };
}

const defaultHandlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Column headers ----

  it("renders all expected column headers", () => {
    render(<SessionsTable sessions={[makeSession()]} {...defaultHandlers} />);

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Speaker")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  // ---- Row data ----

  it("displays the session title and location in each row", () => {
    const sessions = [
      makeSession({ id: "sess-1", title: "Session Alpha", location: "Room A" }),
      makeSession({ id: "sess-2", title: "Session Beta", location: "Room B" }),
    ];

    render(<SessionsTable sessions={sessions} {...defaultHandlers} />);

    expect(screen.getByText("Session Alpha")).toBeInTheDocument();
    expect(screen.getByText("Room A")).toBeInTheDocument();
    expect(screen.getByText("Session Beta")).toBeInTheDocument();
    expect(screen.getByText("Room B")).toBeInTheDocument();
  });

  // ---- Empty state ----

  it('shows "Nessuna sessione trovata" when the sessions array is empty', () => {
    render(<SessionsTable sessions={[]} {...defaultHandlers} />);

    expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
  });

  // ---- Type badge ----

  it("renders the session type as a badge", () => {
    const session = makeSession({ type: "workshop" });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    expect(screen.getByText("workshop")).toBeInTheDocument();
  });

  // ---- Formatted time range ----

  it("formats start and end times as a range (e.g. 'Jun 15, 9:00 AM')", () => {
    const session = makeSession({
      startTime: ts(new Date("2026-06-15T09:00:00")),
      endTime: ts(new Date("2026-06-15T10:30:00")),
    });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    expect(screen.getByText(/Jun 15, 9:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 15, 10:30 AM/)).toBeInTheDocument();
  });

  // ---- Speaker name ----

  it("displays the speaker name in each row", () => {
    const session = makeSession({ speakerName: "John Smith" });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  // ---- Edit button ----

  it("calls onEdit with the session when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: "sess-edit", title: "Edit Me" });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(defaultHandlers.onEdit).toHaveBeenCalledTimes(1);
    expect(defaultHandlers.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sess-edit", title: "Edit Me" }),
    );
  });

  // ---- Delete button ----

  it("calls onDelete with the session id when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: "sess-delete" });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(defaultHandlers.onDelete).toHaveBeenCalledTimes(1);
    expect(defaultHandlers.onDelete).toHaveBeenCalledWith("sess-delete");
  });

  // ---- Session count ----

  it("shows the total session count", () => {
    const sessions = [
      makeSession({ id: "1", title: "A" }),
      makeSession({ id: "2", title: "B" }),
      makeSession({ id: "3", title: "C" }),
    ];

    render(<SessionsTable sessions={sessions} {...defaultHandlers} />);

    expect(screen.getByText(/3 session/)).toBeInTheDocument();
  });

  it("shows singular 'session' for a single session", () => {
    render(<SessionsTable sessions={[makeSession()]} {...defaultHandlers} />);

    expect(screen.getByText(/1 session/)).toBeInTheDocument();
  });

  // ---- Multiple rows ----

  it("renders the correct number of data rows", () => {
    const sessions = [
      makeSession({ id: "1", title: "A" }),
      makeSession({ id: "2", title: "B" }),
      makeSession({ id: "3", title: "C" }),
    ];

    render(<SessionsTable sessions={sessions} {...defaultHandlers} />);

    const rows = screen.getAllByRole("row");
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  // ---- Null location / speaker ----

  it("handles null location gracefully", () => {
    const session = makeSession({ location: null });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    expect(screen.getByText("Intro to TypeScript")).toBeInTheDocument();
  });

  it("handles null speakerName gracefully", () => {
    const session = makeSession({ speakerName: null });

    render(<SessionsTable sessions={[session]} {...defaultHandlers} />);

    expect(screen.getByText("Intro to TypeScript")).toBeInTheDocument();
  });
});
