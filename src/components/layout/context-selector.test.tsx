import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/hooks/use-event-context", () => ({
  useEventContext: vi.fn(),
}));

vi.mock("@/hooks/use-collection", () => ({
  useCollection: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

import { ContextSelector } from "./context-selector";
import * as eventContextHook from "@/hooks/use-event-context";
import * as collectionHook from "@/hooks/use-collection";
import * as permissionsHook from "@/hooks/use-permissions";
import type { UserPermissions } from "@/types/permissions";

const allClients = [
  { id: "client-1", name: "Client Alpha" },
  { id: "client-2", name: "Client Beta" },
  { id: "client-3", name: "Client Gamma" },
];

const allEvents = [
  { id: "event-1", name: "Event One" },
  { id: "event-2", name: "Event Two" },
];

function makeSuperAdminPerms(): UserPermissions {
  return {
    userId: "sa-1",
    email: "sa@test.com",
    role: "superadmin",
    clientIds: null,
    eventIds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "sa-1",
    updatedBy: "sa-1",
  };
}

function makeClientAdminPerms(
  clientIds: string[] = ["client-1"]
): UserPermissions {
  return {
    userId: "ca-1",
    email: "ca@test.com",
    role: "clientAdmin",
    clientIds,
    eventIds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "sa-1",
    updatedBy: "sa-1",
  };
}

function makeEventAdminPerms(
  clientIds: string[] = ["client-1"],
  eventIds: string[] = ["event-1"]
): UserPermissions {
  return {
    userId: "ea-1",
    email: "ea@test.com",
    role: "eventAdmin",
    clientIds,
    eventIds,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "sa-1",
    updatedBy: "sa-1",
  };
}

describe("ContextSelector - Permission-based filtering", () => {
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

  it("superadmin sees client dropdown", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: makeSuperAdminPerms(),
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allClients as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(screen.getByText("Select Client")).toBeInTheDocument();
  });

  it("superadmin sees both client and event dropdowns when client is selected", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: makeSuperAdminPerms(),
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: "client-1",
      selectedEventId: null,
      selectedClientName: "Client Alpha",
      selectedEventName: null,
      setSelectedClient: vi.fn(),
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allEvents as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(screen.getByText("Client Alpha")).toBeInTheDocument();
    expect(screen.getByText("Select Event")).toBeInTheDocument();
  });

  it("hides event dropdown when no client is selected (superadmin)", () => {
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: makeSuperAdminPerms(),
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allClients as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(screen.getByText("Select Client")).toBeInTheDocument();
    expect(screen.queryByText("Select Event")).not.toBeInTheDocument();
  });
});

describe("ContextSelector - Role-based dropdown visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clientAdmin does NOT see client dropdown", () => {
    const setSelectedClient = vi.fn();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: "client-1",
      selectedEventId: null,
      selectedClientName: "Client Alpha",
      selectedEventName: null,
      setSelectedClient,
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: makeClientAdminPerms(["client-1"]),
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allEvents as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    // Should NOT see a client dropdown trigger
    expect(screen.queryByText("Select Client")).not.toBeInTheDocument();
    // Should see the event dropdown
    expect(screen.getByText("Select Event")).toBeInTheDocument();
  });

  it("eventAdmin does NOT see client dropdown", () => {
    const setSelectedClient = vi.fn();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: "client-1",
      selectedEventId: null,
      selectedClientName: "Client Alpha",
      selectedEventName: null,
      setSelectedClient,
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: makeEventAdminPerms(["client-1"], ["event-1"]),
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allEvents as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(screen.queryByText("Select Client")).not.toBeInTheDocument();
    expect(screen.getByText("Select Event")).toBeInTheDocument();
  });

  it("clientAdmin auto-selects first available client when none selected", () => {
    const setSelectedClient = vi.fn();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: null,
      selectedEventId: null,
      selectedClientName: null,
      selectedEventName: null,
      setSelectedClient,
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: makeClientAdminPerms(["client-1"]),
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allClients as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    // Should auto-select the first available client
    expect(setSelectedClient).toHaveBeenCalledWith("client-1", "Client Alpha");
  });

  it("eventAdmin auto-selects first available client when none selected", () => {
    const setSelectedClient = vi.fn();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: null,
      selectedEventId: null,
      selectedClientName: null,
      selectedEventName: null,
      setSelectedClient,
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "eventAdmin",
      permissions: makeEventAdminPerms(["client-1"], ["event-1"]),
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: false,
      isEventAdmin: true,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allClients as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(setSelectedClient).toHaveBeenCalledWith("client-1", "Client Alpha");
  });

  it("does NOT auto-select when client is already selected", () => {
    const setSelectedClient = vi.fn();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: "client-1",
      selectedEventId: null,
      selectedClientName: "Client Alpha",
      selectedEventName: null,
      setSelectedClient,
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "clientAdmin",
      permissions: makeClientAdminPerms(["client-1"]),
      loading: false,
      isSuperAdmin: false,
      isClientAdmin: true,
      isEventAdmin: false,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allEvents as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(setSelectedClient).not.toHaveBeenCalled();
  });

  it("superadmin does NOT auto-select client", () => {
    const setSelectedClient = vi.fn();
    vi.mocked(eventContextHook.useEventContext).mockReturnValue({
      selectedClientId: null,
      selectedEventId: null,
      selectedClientName: null,
      selectedEventName: null,
      setSelectedClient,
      setSelectedEvent: vi.fn(),
      clearSelection: vi.fn(),
    });
    vi.mocked(permissionsHook.usePermissions).mockReturnValue({
      role: "superadmin",
      permissions: makeSuperAdminPerms(),
      loading: false,
      isSuperAdmin: true,
      isClientAdmin: false,
      isEventAdmin: false,
    });
    vi.mocked(collectionHook.useCollection).mockReturnValue({
      data: allClients as any,
      loading: false,
      error: null,
    });

    render(<ContextSelector />);

    expect(setSelectedClient).not.toHaveBeenCalled();
  });
});
