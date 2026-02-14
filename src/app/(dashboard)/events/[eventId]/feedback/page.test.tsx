import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

vi.mock("@/hooks/use-validated-params", () => ({
  useValidatedParams: () => ({ eventId: "evt-1" }),
}));

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

const mockUseFeedback = vi.fn();
vi.mock("@/hooks/use-feedback", () => ({
  useFeedback: (...args: unknown[]) => mockUseFeedback(...args),
}));

// ResizeObserver mock
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import FeedbackPage from "./page";
import * as eventContextHook from "@/hooks/use-event-context";
import * as permissionsHook from "@/hooks/use-permissions";

function setupMocks(overrides?: {
  clientId?: string | null;
  isSuperAdmin?: boolean;
  feedbackData?: unknown[];
  feedbackLoading?: boolean;
  feedbackError?: string | null;
}) {
  vi.mocked(eventContextHook.useEventContext).mockReturnValue({
    selectedClientId: "clientId" in (overrides ?? {}) ? overrides!.clientId! : "client-1",
    selectedEventId: "evt-1",
    selectedClientName: "Client Alpha",
    selectedEventName: "Test Event",
    setSelectedClient: vi.fn(),
    setSelectedEvent: vi.fn(),
    clearSelection: vi.fn(),
  });

  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: overrides?.isSuperAdmin !== false ? "superadmin" : "clientAdmin",
    permissions: null,
    loading: false,
    isSuperAdmin: overrides?.isSuperAdmin !== false,
    isClientAdmin: overrides?.isSuperAdmin === false,
    isEventAdmin: false,
  });

  mockUseFeedback.mockReturnValue({
    data: overrides?.feedbackData ?? [],
    loading: overrides?.feedbackLoading ?? false,
    error: overrides?.feedbackError ?? null,
    refresh: vi.fn(),
  });
}

describe("FeedbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title and description", () => {
    setupMocks();

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(screen.getByText("User Feedback")).toBeInTheDocument();
    expect(
      screen.getByText(/feedback collected from app users/i)
    ).toBeInTheDocument();
  });

  it("shows access denied for non-superadmins", () => {
    setupMocks({ isSuperAdmin: false });

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(
      screen.getByText(/only super admins can view feedback/i)
    ).toBeInTheDocument();
  });

  it("shows NoClientSelected when no client is selected", () => {
    setupMocks({ clientId: null });

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    // NoClientSelected component renders the title
    expect(screen.getByText("No client selected")).toBeInTheDocument();
  });

  it("shows loading skeletons when data is loading", () => {
    setupMocks({ feedbackLoading: true });

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    // Should have skeleton elements
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error banner when there is an error", () => {
    setupMocks({ feedbackError: "Failed to load" });

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    // ErrorBanner shows the error message text
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders feedback table with data", () => {
    setupMocks({
      feedbackData: [
        {
          id: "fb-1",
          feedbackText: "Great app!",
          timestamp: "2026-02-06T19:31:45.978310+00:00",
          chatSessionId: "chat-1",
          userId: "user-1",
          userName: "Alice Smith",
          userEmail: "alice@test.com",
          userCompany: "Acme",
        },
      ],
    });

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(screen.getByText("Great app!")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("calls useFeedback with correct clientId and eventId", () => {
    setupMocks();

    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(mockUseFeedback).toHaveBeenCalledWith("client-1", "evt-1");
  });

  it("renders a refresh button that calls refresh", async () => {
    const mockRefresh = vi.fn();
    setupMocks();
    mockUseFeedback.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    const user = userEvent.setup();
    render(<FeedbackPage params={Promise.resolve({ eventId: "evt-1" })} />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
