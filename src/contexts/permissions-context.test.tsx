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
const mockVerifyPermissions = vi.fn();
vi.mock("@/lib/auth", () => ({
  verifyPermissions: (...args: unknown[]) => mockVerifyPermissions(...args),
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
    mockVerifyPermissions.mockReturnValue(new Promise(() => {})); // never resolves

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

  it("resolves superadmin (no permissions doc needed)", async () => {
    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockVerifyPermissions.mockResolvedValue({
      role: "superadmin",
      permissions: null,
    });

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
  });

  it("resolves clientAdmin with permissions", async () => {
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
    mockVerifyPermissions.mockResolvedValue({
      role: "clientAdmin",
      permissions: mockPerms,
    });

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
  });

  it("resolves eventAdmin with permissions", async () => {
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
    mockVerifyPermissions.mockResolvedValue({
      role: "eventAdmin",
      permissions: mockPerms,
    });

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

  it("sets role to null when no permissions found", async () => {
    mockUseAuth.mockReturnValue({ user: createMockUser(), loading: false });
    mockVerifyPermissions.mockResolvedValue({
      role: null,
      permissions: null,
    });

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
