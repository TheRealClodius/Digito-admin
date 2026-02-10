import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing component
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/components/layout/context-selector", () => ({
  ContextSelector: () => <div data-testid="context-selector">Context Selector</div>,
}));

vi.mock("@/lib/auth", () => ({
  signOut: vi.fn(),
}));

import { AppSidebar } from "./app-sidebar";
import * as eventContextHook from "@/hooks/use-event-context";
import * as permissionsHook from "@/hooks/use-permissions";

describe("AppSidebar - Role-based navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: null,
      selectedEventId: null,
      selectedClientName: null,
      selectedEventName: null,
      setSelectedClient: vi.fn(),
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
  });

  it("superadmin sees Dashboard and Clients nav items", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: null,
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<AppSidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
  });

  it("clientAdmin does NOT see Dashboard or Clients nav items", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });

    render(<AppSidebar />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Clients")).not.toBeInTheDocument();
  });

  it("eventAdmin does NOT see Dashboard or Clients nav items", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });

    render(<AppSidebar />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Clients")).not.toBeInTheDocument();
  });

  it("user with no role sees no main nav items", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: null,
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<AppSidebar />);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Clients")).not.toBeInTheDocument();
  });

  it("shows event nav when an event is selected", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: null,
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: "client-1",
      selectedEventId: "event-1",
      selectedClientName: "Client 1",
      selectedEventName: "Event 1",
      setSelectedClient: vi.fn(),
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });

    render(<AppSidebar />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Stands")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("hides event nav when no event is selected", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: null,
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });

    render(<AppSidebar />);

    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Stands")).not.toBeInTheDocument();
  });

  it("always shows Settings and Sign Out", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: null,
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });

    render(<AppSidebar />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });
});
