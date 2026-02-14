import { render, screen } from "@testing-library/react";
import { FeedbackTable } from "./feedback-table";
import type { FeedbackEntry } from "@/types/feedback";

// Mock Firebase to prevent initialization errors
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// ResizeObserver mock required by Radix UI primitives in jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function makeFeedback(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: "fb-1",
    feedbackText: "Great app, love the design!",
    timestamp: "2026-02-06T19:31:45.978310+00:00",
    chatSessionId: "chat-session-1",
    userId: "user-1",
    userName: "Alice Smith",
    userEmail: "alice@test.com",
    userCompany: "Acme Corp",
    ...overrides,
  };
}

describe("FeedbackTable", () => {
  it("renders all expected column headers", () => {
    render(<FeedbackTable entries={[makeFeedback()]} />);

    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
  });

  it("displays user name and email in each row", () => {
    render(
      <FeedbackTable
        entries={[
          makeFeedback({ id: "fb-1", userName: "Alice Smith", userEmail: "alice@test.com" }),
          makeFeedback({ id: "fb-2", userName: "Bob Jones", userEmail: "bob@test.com" }),
        ]}
      />
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });

  it("displays feedback text", () => {
    render(
      <FeedbackTable
        entries={[makeFeedback({ feedbackText: "The map feature is wonderful" })]}
      />
    );

    expect(screen.getByText("The map feature is wonderful")).toBeInTheDocument();
  });

  it("displays company name", () => {
    render(
      <FeedbackTable entries={[makeFeedback({ userCompany: "Beta Inc" })]} />
    );

    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
  });

  it("formats the timestamp as a readable date", () => {
    render(
      <FeedbackTable
        entries={[makeFeedback({ timestamp: "2026-02-06T19:31:45.978310+00:00" })]}
      />
    );

    // Should display formatted date (Feb 6, 2026 or similar)
    expect(screen.getByText(/Feb 6/)).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    render(<FeedbackTable entries={[]} />);

    expect(screen.getByText(/no feedback/i)).toBeInTheDocument();
  });

  it("shows the entry count", () => {
    const entries = [
      makeFeedback({ id: "1" }),
      makeFeedback({ id: "2" }),
      makeFeedback({ id: "3" }),
    ];

    render(<FeedbackTable entries={entries} />);

    expect(screen.getByText(/3 feedback/i)).toBeInTheDocument();
  });

  it("renders the correct number of data rows", () => {
    const entries = [
      makeFeedback({ id: "1" }),
      makeFeedback({ id: "2" }),
    ];

    render(<FeedbackTable entries={entries} />);

    const rows = screen.getAllByRole("row");
    // 1 header row + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("handles empty user fields gracefully", () => {
    render(
      <FeedbackTable
        entries={[makeFeedback({ userName: "", userEmail: "", userCompany: "" })]}
      />
    );

    // Should still render the row without crashing
    expect(screen.getByText("Great app, love the design!")).toBeInTheDocument();
  });
});
