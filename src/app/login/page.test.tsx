import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock Firebase modules before any imports that might trigger initialization
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

// Mock auth module
const mockSignInWithGoogle = vi.fn();
const mockCheckUserRole = vi.fn();
const mockGetUserPermissions = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/auth", () => ({
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  checkUserRole: (...args: unknown[]) => mockCheckUserRole(...args),
  getUserPermissions: (...args: unknown[]) => mockGetUserPermissions(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

import LoginPage from "./page";

const fakeUser = { uid: "user-1", email: "test@test.com" };

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Digito logo in side panel", () => {
    render(<LoginPage />);
    const logo = screen.getByRole("img", { name: /digito logo/i });
    expect(logo).toBeInTheDocument();
  });

  it("renders multiple background images for cycling", () => {
    render(<LoginPage />);
    const backgrounds = screen.getAllByAltText(/background/i);
    expect(backgrounds.length).toBeGreaterThan(1);
  });

  it("applies delayed fade-in animation to background container", () => {
    render(<LoginPage />);
    const backgrounds = screen.getAllByAltText(/background/i);
    const container = backgrounds[0].parentElement;
    expect(container).toHaveClass("animate-fade-in-delayed");
  });

  it("renders a light mode overlay mask on background images", () => {
    render(<LoginPage />);
    const mask = screen.getByTestId("background-mask");
    expect(mask).toBeInTheDocument();
    expect(mask).toHaveClass("bg-white/75");
  });

  it("renders all login options", () => {
    render(<LoginPage />);
    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    const ssoButton = screen.getByRole("button", { name: /login with sso/i });
    const magicLinkButton = screen.getByRole("button", { name: /connect with magic link/i });

    expect(googleButton).toBeInTheDocument();
    expect(ssoButton).toBeInTheDocument();
    expect(magicLinkButton).toBeInTheDocument();
  });

  it("redirects to /unauthorized when user has no role and no Firestore permissions", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);
    mockCheckUserRole.mockResolvedValue(null);
    mockGetUserPermissions.mockResolvedValue(null);
    mockSignOut.mockResolvedValue(undefined);

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).toHaveBeenCalledWith("/unauthorized");
  });

  it("redirects to / when user is superadmin", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);
    mockCheckUserRole.mockResolvedValue("superadmin");

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("redirects to / when user is clientAdmin", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);
    mockCheckUserRole.mockResolvedValue("clientAdmin");

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("falls back to Firestore permissions when no claims found", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);
    mockCheckUserRole.mockResolvedValue(null);
    mockGetUserPermissions.mockResolvedValue({
      role: "clientAdmin",
      clientIds: ["client-1"],
    });

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
