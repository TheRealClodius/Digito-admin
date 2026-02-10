import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase modules before any imports
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

vi.mock("@/hooks/use-validated-params", () => ({
  useValidatedParams: () => ({ eventId: "evt-1" }),
}));

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-collection-count", () => ({
  useCollectionCount: vi.fn(() => ({ count: 0, loading: false })),
}));

vi.mock("@/hooks/use-document", () => ({
  useDocument: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  updateDocument: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/hooks/use-upload", () => ({
  useUpload: () => ({
    upload: vi.fn(),
    deleteFile: vi.fn(),
  }),
}));

import EventOverviewPage from "./page";
import * as eventContextHook from "@/hooks/use-event-context";
import * as useDocumentHook from "@/hooks/use-document";
import * as permissionsHook from "@/hooks/use-permissions";

const mockEvent = {
  id: "evt-1",
  clientId: "client-1",
  name: "Test Event",
  description: "A test event",
  venue: "Test Venue",
  startDate: { toDate: () => new Date("2025-06-01T10:00:00Z") },
  endDate: { toDate: () => new Date("2025-06-02T18:00:00Z") },
  isActive: true,
  logoUrl: null,
  bannerUrl: null,
  websiteUrl: "https://example.com",
  instagramUrl: null,
  chatPrompt: null,
  imageUrls: [],
  createdAt: { toDate: () => new Date("2025-01-01T00:00:00Z") },
};

function setupMocks(overrides?: { event?: typeof mockEvent | null; loading?: boolean }) {
  vi.mocked(eventContextHook.useEventContext).mockReturnValue({
    selectedClientId: "client-1",
    selectedEventId: "evt-1",
    selectedClientName: "Client Alpha",
    selectedEventName: "Test Event",
    setSelectedClient: vi.fn(),
    setSelectedEvent: vi.fn(),
    clearSelection: vi.fn(),
  });

  vi.mocked(useDocumentHook.useDocument).mockReturnValue({
    data: overrides?.event !== undefined ? overrides.event : mockEvent,
    loading: overrides?.loading ?? false,
    error: null,
  } as ReturnType<typeof useDocumentHook.useDocument>);

  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: "superadmin",
    permissions: null,
    loading: false,
    isSuperAdmin: true,
    isClientAdmin: false,
    isEventAdmin: false,
  });
}

describe("EventOverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the overview page with stats cards", () => {
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(screen.getByText("Event Overview")).toBeInTheDocument();
  });

  it("renders an Edit button for the event", () => {
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("opens the edit sheet when Edit button is clicked", async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventId: "evt-1" })} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByText("Edit Event")).toBeInTheDocument();
  });

  it("pre-fills the form with event data when editing", async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventId: "evt-1" })} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByDisplayValue("Test Event")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Venue")).toBeInTheDocument();
  });

  it("does not show Edit button for event admins (read-only)", () => {
    setupMocks();
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });

    render(<EventOverviewPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("shows prompt when no client is selected", () => {
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: null,
      selectedEventId: null,
      selectedClientName: null,
      selectedEventName: null,
      setSelectedClient: vi.fn(),
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });

    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: null,
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<EventOverviewPage params={Promise.resolve({ eventId: "evt-1" })} />);

    expect(screen.getByText(/select a client/i)).toBeInTheDocument();
  });
});
