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
const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockCheckSuperAdmin = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  checkSuperAdmin: (...args: unknown[]) => mockCheckSuperAdmin(...args),
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

  it("renders side panel with title and description", () => {
    render(<LoginPage />);
    expect(screen.getByText("Digito Admin")).toBeInTheDocument();
    expect(screen.getByText(/sign in to manage your events/i)).toBeInTheDocument();
  });

  it("renders all login options", () => {
    render(<LoginPage />);
    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    const ssoButton = screen.getByRole("button", { name: /login with sso/i });
    const magicLinkButton = screen.getByRole("button", { name: /connect with magic link/i });

    expect(googleButton).toBeInTheDocument();
    expect(ssoButton).toBeInTheDocument();
    expect(magicLinkButton).toBeInTheDocument();

    // Email and password inputs should not be present
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("calls signOut before redirecting when Google sign-in user is not admin", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);
    mockCheckSuperAdmin.mockResolvedValue(false);
    mockSignOut.mockResolvedValue(undefined);

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).toHaveBeenCalledWith("/unauthorized");
  });

  it("does NOT call signOut when user is admin (Google sign-in)", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(fakeUser);
    mockCheckSuperAdmin.mockResolvedValue(true);

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /sign in with google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
