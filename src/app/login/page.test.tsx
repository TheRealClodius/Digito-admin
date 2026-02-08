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

describe("LoginPage — sign out on non-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("calls signOut before redirecting when email/password user is not admin", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(fakeUser);
    mockCheckSuperAdmin.mockResolvedValue(false);
    mockSignOut.mockResolvedValue(undefined);

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

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

  it("does NOT call signOut when user is admin (email/password)", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(fakeUser);
    mockCheckSuperAdmin.mockResolvedValue(true);

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
