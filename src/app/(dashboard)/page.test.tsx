import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/hooks/use-aggregate-stats", () => ({
  useAggregateStats: vi.fn(() => ({
    stats: { totalClients: 0, totalEvents: 0, activeEvents: 0, totalParticipants: 0 },
    loading: false,
  })),
}));

import DashboardHome from "./page";
import * as eventContextHook from "@/hooks/use-event-context";
import * as permissionsHook from "@/hooks/use-permissions";

describe("DashboardHome - Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: "client-1",
      selectedEventId: "event-1",
      selectedClientName: "Client Alpha",
      selectedEventName: "Event One",
      setSelectedClient: vi.fn(),
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
  });

  it("superadmin sees the platform stats dashboard", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: null,
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<DashboardHome />);

    expect(screen.getByText("SuperAdmin Dashboard")).toBeInTheDocument();
  });

  it("clientAdmin sees welcome page with event selection prompt", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });

    render(<DashboardHome />);

    expect(screen.getByText("Welcome to Digito Admin")).toBeInTheDocument();
    expect(screen.getByText("Select a client and event from the sidebar to get started.")).toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
  });

  it("eventAdmin sees welcome page with event selection prompt", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });

    render(<DashboardHome />);

    expect(screen.getByText("Welcome to Digito Admin")).toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
  });

  it("user with no role sees Access Denied", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: null,
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<DashboardHome />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });
});
