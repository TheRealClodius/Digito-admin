import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
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

  it("superadmin can access Dashboard", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: null,
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<DashboardHome />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("clientAdmin sees Access Denied on Dashboard", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });

    render(<DashboardHome />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("eventAdmin sees Access Denied on Dashboard", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });

    render(<DashboardHome />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
