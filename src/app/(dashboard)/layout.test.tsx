import { render } from "@testing-library/react";
import { vi } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth
const mockSignOut = vi.fn();
vi.mock("@/lib/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock useAuth and usePermissions
const mockUseAuth = vi.fn();
const mockUsePermissions = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: (...args: unknown[]) => mockUsePermissions(...args),
}));

// Mock layout sub-components to avoid deep rendering
vi.mock("@/components/layout/app-sidebar", () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));
vi.mock("@/components/layout/header", () => ({
  Header: () => <div data-testid="header" />,
}));

import DashboardLayout from "./layout";

const fakeUser = { uid: "user-1", email: "test@test.com" };

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signOut when user is authenticated but has no role", async () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    mockUsePermissions.mockReturnValue({ role: null, loading: false });
    mockSignOut.mockResolvedValue(undefined);

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).toHaveBeenCalledWith("/unauthorized");
  });

  it("does NOT call signOut when user is superadmin", () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    mockUsePermissions.mockReturnValue({ role: "superadmin", loading: false });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does NOT call signOut when user is clientAdmin", () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    mockUsePermissions.mockReturnValue({ role: "clientAdmin", loading: false });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does NOT call signOut when user is eventAdmin", () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    mockUsePermissions.mockReturnValue({ role: "eventAdmin", loading: false });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does NOT call signOut while still loading", () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: true });
    mockUsePermissions.mockReturnValue({ role: null, loading: true });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects to /login when not authenticated", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUsePermissions.mockReturnValue({ role: null, loading: false });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
