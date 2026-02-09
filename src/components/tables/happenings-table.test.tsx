import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HappeningsTable } from "./happenings-table";

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

// ResizeObserver mock (needed by some UI primitives in jsdom)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Firestore-style Timestamp stub from a Date. */
function ts(date: Date) {
  return { toDate: () => date };
}

/** Convenience factory for building Happening objects used in tests. */
function makeHappening(overrides: Record<string, unknown> = {}) {
  return {
    id: "hap-1",
    title: "Opening Demo",
    description: "A live product demo",
    startTime: ts(new Date("2026-06-15T10:00:00")),
    endTime: ts(new Date("2026-06-15T11:00:00")),
    location: "Main Stage",
    type: "demo",
    hostName: "Jane Smith",
    hostAvatarUrl: null,
    imageUrl: null,
    brandId: null,
    isHighlighted: false,
    requiresAccess: false,
    accessTier: null,
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

describe("HappeningsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Column headers ----

  it("renders all expected column headers", () => {
    render(
      <HappeningsTable happenings={[makeHappening()]} {...defaultHandlers} />,
    );

    expect(screen.getByText("Titolo")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("In Evidenza")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  // ---- Row data ----

  it("displays the happening title and location in each row", () => {
    const happenings = [
      makeHappening({ id: "hap-1", title: "Alpha Demo", location: "Room A" }),
      makeHappening({ id: "hap-2", title: "Beta Launch", location: "Room B" }),
    ];

    render(
      <HappeningsTable happenings={happenings} {...defaultHandlers} />,
    );

    expect(screen.getByText("Alpha Demo")).toBeInTheDocument();
    expect(screen.getByText("Room A")).toBeInTheDocument();
    expect(screen.getByText("Beta Launch")).toBeInTheDocument();
    expect(screen.getByText("Room B")).toBeInTheDocument();
  });

  // ---- Empty state ----

  it('shows "Nessun evento trovato" when the happenings array is empty', () => {
    render(<HappeningsTable happenings={[]} {...defaultHandlers} />);

    expect(screen.getByText(/no happenings found/i)).toBeInTheDocument();
  });

  // ---- Edit button ----

  it("calls onEdit with the happening when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const happening = makeHappening({ id: "hap-edit" });

    render(
      <HappeningsTable happenings={[happening]} {...defaultHandlers} />,
    );

    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);

    expect(defaultHandlers.onEdit).toHaveBeenCalledTimes(1);
    expect(defaultHandlers.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "hap-edit", title: "Opening Demo" }),
    );
  });

  // ---- Delete button ----

  it("calls onDelete with the happening id when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const happening = makeHappening({ id: "hap-delete" });

    render(
      <HappeningsTable happenings={[happening]} {...defaultHandlers} />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(defaultHandlers.onDelete).toHaveBeenCalledTimes(1);
    expect(defaultHandlers.onDelete).toHaveBeenCalledWith("hap-delete");
  });

  // ---- Type badge ----

  it("renders the happening type as a badge", () => {
    const happening = makeHappening({ type: "performance" });

    render(
      <HappeningsTable happenings={[happening]} {...defaultHandlers} />,
    );

    expect(screen.getByText("performance")).toBeInTheDocument();
  });

  // ---- Count footer / summary ----

  it("renders the count of happenings in a summary", () => {
    const happenings = [
      makeHappening({ id: "1" }),
      makeHappening({ id: "2" }),
      makeHappening({ id: "3" }),
    ];

    render(
      <HappeningsTable happenings={happenings} {...defaultHandlers} />,
    );

    expect(screen.getByText(/3 happening/)).toBeInTheDocument();
  });

  it("renders singular count for one happening", () => {
    render(
      <HappeningsTable happenings={[makeHappening()]} {...defaultHandlers} />,
    );

    expect(screen.getByText(/1 happening/)).toBeInTheDocument();
  });

  // ---- Null location / host ----

  it("handles null location gracefully", () => {
    const happening = makeHappening({ location: null });

    render(
      <HappeningsTable happenings={[happening]} {...defaultHandlers} />,
    );

    // Should render without crashing; title still visible
    expect(screen.getByText("Opening Demo")).toBeInTheDocument();
  });

  it("handles null hostName gracefully", () => {
    const happening = makeHappening({ hostName: null });

    render(
      <HappeningsTable happenings={[happening]} {...defaultHandlers} />,
    );

    // Should render without crashing; title still visible
    expect(screen.getByText("Opening Demo")).toBeInTheDocument();
  });

  // ---- Multiple rows ----

  it("renders the correct number of rows for multiple happenings", () => {
    const happenings = [
      makeHappening({ id: "1", title: "Happening A" }),
      makeHappening({ id: "2", title: "Happening B" }),
      makeHappening({ id: "3", title: "Happening C" }),
    ];

    render(
      <HappeningsTable happenings={happenings} {...defaultHandlers} />,
    );

    const rows = screen.getAllByRole("row");
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
  });
});
