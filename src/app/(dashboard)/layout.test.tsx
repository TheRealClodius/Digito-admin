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

// Mock useAuth and useAdminCheck
const mockUseAuth = vi.fn();
const mockUseAdminCheck = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));
vi.mock("@/hooks/use-admin-check", () => ({
  useAdminCheck: (...args: unknown[]) => mockUseAdminCheck(...args),
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

describe("DashboardLayout — sign out non-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signOut when user is authenticated but not admin", async () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    mockUseAdminCheck.mockReturnValue({ isAdmin: false, loading: false });
    mockSignOut.mockResolvedValue(undefined);

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    // useEffect runs asynchronously, wait a tick
    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).toHaveBeenCalledWith("/unauthorized");
  });

  it("does NOT call signOut when user is admin", () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    mockUseAdminCheck.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does NOT call signOut while still loading", () => {
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: true });
    mockUseAdminCheck.mockReturnValue({ isAdmin: null, loading: true });

    render(
      <DashboardLayout>
        <div>Dashboard content</div>
      </DashboardLayout>
    );

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
