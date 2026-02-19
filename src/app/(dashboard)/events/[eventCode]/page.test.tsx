import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";

function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={qc}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>
  );
}

vi.mock("@/hooks/use-validated-params", () => ({
  useValidatedParams: () => ({ eventCode: "evt-1" }),
}));

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-api-document", () => ({
  useApiDocument: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/hooks/use-upload", () => ({
  useUpload: () => ({
    upload: vi.fn(),
    deleteFile: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-ai-improve", () => ({
  useAIImprove: vi.fn(() => ({
    isLoading: false,
    error: null,
    result: null,
    improve: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock("@/contexts/ai-suggestion-context", () => ({
  useAISuggestion: vi.fn(() => ({
    hasActiveSuggestion: false,
    setHasActiveSuggestion: vi.fn(),
  })),
}));

import EventOverviewPage from "./page";
import * as eventContextHook from "@/hooks/use-event-context";
import * as useApiDocumentHook from "@/hooks/use-api-document";
import * as permissionsHook from "@/hooks/use-permissions";

const mockEvent = {
  id: "evt-1",
  clientId: "client-1",
  name: "Test Event",
  description: "A test event",
  venue: "Test Venue",
  startDate: "2025-06-01T10:00:00.000Z",
  endDate: "2025-06-02T18:00:00.000Z",
  isActive: true,
  logoUrl: null,
  bannerUrl: null,
  websiteUrl: "https://example.com",
  instagramUrl: null,
  chatPrompt: null,
  imageUrls: [],
};

const mockStats = {
  brands: 5,
  sessions: 10,
  happenings: 3,
  whitelist: 42,
  users: 100,
  posts: 25,
};

function setupMocks(overrides?: {
  event?: typeof mockEvent | null;
  stats?: typeof mockStats | null;
  loading?: boolean;
  statsLoading?: boolean;
  clientId?: string | null;
  isEventAdmin?: boolean;
}) {
  vi.mocked(eventContextHook.useEventContext).mockReturnValue({
    selectedClientId: overrides?.clientId !== undefined ? overrides.clientId : "client-1",
    selectedEventCode: "evt-1",
    selectedClientName: "Client Alpha",
    selectedEventName: "Test Event",
    setSelectedClient: vi.fn(),
    setSelectedEvent: vi.fn(),
    clearSelection: vi.fn(),
  });

  // useApiDocument is called twice per render: once for event, once for stats
  // Use mockImplementation to handle re-renders properly
  let callIndex = 0;
  const eventResult = {
    data: overrides?.event !== undefined ? overrides.event : mockEvent,
    loading: overrides?.loading ?? false,
    error: null,
  };
  const statsResult = {
    data: overrides?.stats !== undefined ? overrides.stats : mockStats,
    loading: overrides?.statsLoading ?? false,
    error: null,
  };
  vi.mocked(useApiDocumentHook.useApiDocument).mockImplementation(() => {
    const result = callIndex % 2 === 0 ? eventResult : statsResult;
    callIndex++;
    return result as any;
  });

  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: overrides?.isEventAdmin ? "eventAdmin" : "superadmin",
    permissions: null,
    loading: false,
    isSuperAdmin: !overrides?.isEventAdmin,
    isClientAdmin: false,
    isEventAdmin: overrides?.isEventAdmin ?? false,
  });
}

describe("EventOverviewPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the overview page with stats cards", () => {
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventCode: "evt-1" })} />);

    expect(screen.getByText("Event Overview")).toBeInTheDocument();
  });

  it("renders an Edit button for the event", () => {
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventCode: "evt-1" })} />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("opens the edit sheet when Edit button is clicked", async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventCode: "evt-1" })} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByText("Edit Event")).toBeInTheDocument();
  });

  it("pre-fills the form with event data when editing", async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<EventOverviewPage params={Promise.resolve({ eventCode: "evt-1" })} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByDisplayValue("Test Event")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Venue")).toBeInTheDocument();
  });

  it("does not show Edit button for event admins (read-only)", () => {
    setupMocks({ isEventAdmin: true });

    render(<EventOverviewPage params={Promise.resolve({ eventCode: "evt-1" })} />);

    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("shows prompt when no client is selected", () => {
    setupMocks({ clientId: null });

    render(<EventOverviewPage params={Promise.resolve({ eventCode: "evt-1" })} />);

    expect(screen.getByText(/select a client/i)).toBeInTheDocument();
  });
});
