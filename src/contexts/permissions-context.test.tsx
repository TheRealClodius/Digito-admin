import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { User } from "firebase/auth";
import type { UserPermissions } from "@/types/permissions";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock auth functions
const mockCheckUserRole = vi.fn();
const mockGetUserPermissions = vi.fn();
vi.mock("@/lib/auth", () => ({
  checkUserRole: (...args: unknown[]) => mockCheckUserRole(...args),
  getUserPermissions: (...args: unknown[]) => mockGetUserPermissions(...args),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { PermissionsProvider, usePermissions } from "./permissions-context";

function createMockUser(uid = "test-uid"): User {
  return { uid, email: "test@test.com" } as User;
}

function TestComponent() {
  const { role, permissions, loading, isSuperAdmin, isClientAdmin, isEventAdmin } =
    usePermissions();

  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="role">{role ?? "none"}</div>
      <div data-testid="is-superadmin">{String(isSuperAdmin)}</div>
      <div data-testid="is-client-admin">{String(isClientAdmin)}</div>
      <div data-testid="is-event-admin">{String(isEventAdmin)}</div>
      <div data-testid="client-ids">
        {permissions?.clientIds ? permissions.clientIds.join(",") : "null"}
      </div>
      <div data-testid="event-ids">
        {permissions?.eventIds ? permissions.eventIds.join(",") : "null"}
      </div>
    </div>
  );
}

describe("PermissionsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while resolving", () => {
    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockCheckUserRole.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
  });

  it("shows loading when auth is still loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
  });

  it("resolves superadmin from claims (no Firestore read needed)", async () => {
    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockCheckUserRole.mockResolvedValue("superadmin");

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("role")).toHaveTextContent("superadmin");
    expect(screen.getByTestId("is-superadmin")).toHaveTextContent("true");
    expect(screen.getByTestId("is-client-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("is-event-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("client-ids")).toHaveTextContent("null");
    expect(screen.getByTestId("event-ids")).toHaveTextContent("null");
    // Superadmin should NOT trigger a Firestore read
    expect(mockGetUserPermissions).not.toHaveBeenCalled();
  });

  it("resolves clientAdmin from claims and fetches permissions from Firestore", async () => {
    const mockPerms: UserPermissions = {
      userId: "test-uid",
      email: "admin@test.com",
      role: "clientAdmin",
      clientIds: ["client-1", "client-2"],
      eventIds: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "creator",
      updatedBy: "creator",
    };

    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockCheckUserRole.mockResolvedValue("clientAdmin");
    mockGetUserPermissions.mockResolvedValue(mockPerms);

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("role")).toHaveTextContent("clientAdmin");
    expect(screen.getByTestId("is-superadmin")).toHaveTextContent("false");
    expect(screen.getByTestId("is-client-admin")).toHaveTextContent("true");
    expect(screen.getByTestId("client-ids")).toHaveTextContent("client-1,client-2");
    expect(mockGetUserPermissions).toHaveBeenCalledWith("test-uid");
  });

  it("resolves eventAdmin from claims and fetches permissions from Firestore", async () => {
    const mockPerms: UserPermissions = {
      userId: "test-uid",
      email: "event@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1", "event-2"],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "creator",
      updatedBy: "creator",
    };

    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockCheckUserRole.mockResolvedValue("eventAdmin");
    mockGetUserPermissions.mockResolvedValue(mockPerms);

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("role")).toHaveTextContent("eventAdmin");
    expect(screen.getByTestId("is-event-admin")).toHaveTextContent("true");
    expect(screen.getByTestId("client-ids")).toHaveTextContent("client-1");
    expect(screen.getByTestId("event-ids")).toHaveTextContent("event-1,event-2");
  });

  it("sets role to null when user has no claims and no Firestore permissions", async () => {
    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockCheckUserRole.mockResolvedValue(null);
    mockGetUserPermissions.mockResolvedValue(null);

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("role")).toHaveTextContent("none");
    expect(screen.getByTestId("is-superadmin")).toHaveTextContent("false");
    expect(screen.getByTestId("is-client-admin")).toHaveTextContent("false");
    expect(screen.getByTestId("is-event-admin")).toHaveTextContent("false");
  });

  it("falls back to Firestore permissions when no claims found", async () => {
    const mockPerms: UserPermissions = {
      userId: "test-uid",
      email: "test@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
      eventIds: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "creator",
      updatedBy: "creator",
    };

    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockCheckUserRole.mockResolvedValue(null); // No claims
    mockGetUserPermissions.mockResolvedValue(mockPerms); // But Firestore doc exists

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("role")).toHaveTextContent("clientAdmin");
    expect(screen.getByTestId("is-client-admin")).toHaveTextContent("true");
  });

  it("resets to null when user signs out", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <PermissionsProvider>
        <TestComponent />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });

  it("throws error when usePermissions is used outside PermissionsProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("usePermissions must be used within PermissionsProvider");

    consoleSpy.mockRestore();
  });
});
