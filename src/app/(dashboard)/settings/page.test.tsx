import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { userEvent } from "@testing-library/user-event";
import SettingsPage from "./page";
import * as themeContext from "@/contexts/theme-context";
import * as authHook from "@/hooks/use-auth";
import * as permissionsHook from "@/hooks/use-permissions";
import * as adminManagementHook from "@/hooks/use-admin-management";
import * as collectionHook from "@/hooks/use-collection";

// Mock hooks
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/theme-context", () => ({
  useTheme: vi.fn(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/hooks/use-admin-management", () => ({
  useAdminManagement: vi.fn(),
}));

vi.mock("@/hooks/use-collection", () => ({
  useCollection: vi.fn(),
}));

function setupMocks(overrides?: {
  role?: string;
  isSuperAdmin?: boolean;
  isClientAdmin?: boolean;
}) {
  const mockSetThemeMode = vi.fn();

  vi.mocked(authHook.useAuth).mockReturnValue({
    user: {
      uid: "test-uid",
      email: "test@example.com",
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
    } as any,
    loading: false,
  });

  vi.mocked(themeContext.useTheme).mockReturnValue({
    theme: "light",
    themeMode: "light",
    setTheme: vi.fn(),
    setThemeMode: mockSetThemeMode,
    toggleTheme: vi.fn(),
  });

  vi.mocked(permissionsHook.usePermissions).mockReturnValue({
    role: (overrides?.role as any) ?? "superadmin",
    permissions: null,
    loading: false,
    isSuperAdmin: overrides?.isSuperAdmin ?? true,
    isClientAdmin: overrides?.isClientAdmin ?? false,
    isEventAdmin: false,
  });

  vi.mocked(adminManagementHook.useAdminManagement).mockReturnValue({
    admins: [
      {
        id: "user-1",
        email: "admin1@test.com",
        role: "clientAdmin",
        clientIds: ["c1"],
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "sa-1",
        updatedBy: "sa-1",
      },
    ] as any,
    loading: false,
    error: null,
    addAdmin: vi.fn(),
    removeAdmin: vi.fn(),
  });

  vi.mocked(collectionHook.useCollection).mockReturnValue({
    data: [
      { id: "c1", name: "Client Alpha" },
      { id: "c2", name: "Client Beta" },
    ] as any,
    loading: false,
    error: null,
  });

  return { mockSetThemeMode };
}

describe("SettingsPage - Theme Mode Selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders theme mode selector with three options", () => {
    setupMocks();

    render(<SettingsPage />);

    expect(screen.getByLabelText("Light")).toBeInTheDocument();
    expect(screen.getByLabelText("Dark")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Auto \(currently/)).toBeInTheDocument();
  });

  it("shows current mode selection - Light", () => {
    setupMocks();

    render(<SettingsPage />);

    const lightOption = screen.getByLabelText("Light");
    expect(lightOption).toBeChecked();
  });

  it("shows current mode selection - Dark", () => {
    setupMocks();
    vi.mocked(themeContext.useTheme).mockReturnValue({
      theme: "dark",
      themeMode: "dark",
      setTheme: vi.fn(),
      setThemeMode: vi.fn(),
      toggleTheme: vi.fn(),
    });

    render(<SettingsPage />);

    const darkOption = screen.getByLabelText("Dark");
    expect(darkOption).toBeChecked();
  });

  it("calls setThemeMode when user selects Dark", async () => {
    const user = userEvent.setup();
    const { mockSetThemeMode } = setupMocks();

    render(<SettingsPage />);

    const darkOption = screen.getByLabelText("Dark");
    await user.click(darkOption);

    expect(mockSetThemeMode).toHaveBeenCalledWith("dark");
  });
});

describe("SettingsPage - Admin Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("superadmin sees admin management card", () => {
    setupMocks({ isSuperAdmin: true });

    render(<SettingsPage />);

    expect(screen.getByText("Super Admins")).toBeInTheDocument();
  });

  it("superadmin sees list of current admins", () => {
    setupMocks({ isSuperAdmin: true });

    render(<SettingsPage />);

    expect(screen.getByText("admin1@test.com")).toBeInTheDocument();
    expect(screen.getByText(/clientAdmin/)).toBeInTheDocument();
  });

  it("superadmin sees Add Admin button", () => {
    setupMocks({ isSuperAdmin: true });

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: /add admin/i })).toBeInTheDocument();
  });

  it("superadmin sees remove button for each admin", () => {
    setupMocks({ isSuperAdmin: true });

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("clientAdmin does not see admin management card", () => {
    setupMocks({ role: "clientAdmin", isSuperAdmin: false, isClientAdmin: true });

    render(<SettingsPage />);

    expect(screen.queryByText("Super Admins")).not.toBeInTheDocument();
  });

  it("eventAdmin does not see admin management card", () => {
    setupMocks({ role: "eventAdmin", isSuperAdmin: false, isClientAdmin: false });

    render(<SettingsPage />);

    expect(screen.queryByText("Super Admins")).not.toBeInTheDocument();
  });

  it("calls removeAdmin when remove button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    const mockRemoveAdmin = vi.fn().mockResolvedValue({ success: true });
    setupMocks({ isSuperAdmin: true });
    vi.mocked(adminManagementHook.useAdminManagement).mockReturnValue({
      admins: [
        {
          id: "user-1",
          email: "admin1@test.com",
          role: "clientAdmin",
          clientIds: ["c1"],
          userId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "sa-1",
          updatedBy: "sa-1",
        },
      ] as any,
      loading: false,
      error: null,
      addAdmin: vi.fn(),
      removeAdmin: mockRemoveAdmin,
    });

    render(<SettingsPage />);

    // Click remove button
    await user.click(screen.getByRole("button", { name: /remove/i }));

    // Confirm in the dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirm|yes|remove/i }));

    await waitFor(() => {
      expect(mockRemoveAdmin).toHaveBeenCalledWith("user-1");
    });
  });
});
