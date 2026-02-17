import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth module
const mockSignInWithGoogle = vi.fn();
vi.mock("@/lib/auth", () => ({
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
}));

// Mock hooks
const mockUseAuth = vi.fn(() => ({ user: null, loading: false }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsePermissions = vi.fn(() => ({ role: null, loading: false }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUsePermissions.mockReturnValue({ role: null, loading: false });
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
    const googleButton = screen.getByRole("button", { name: /signInWithGoogle/i });
    const ssoButton = screen.getByRole("button", { name: /loginWithSSO/i });
    const magicLinkButton = screen.getByRole("button", { name: /connectWithMagicLink/i });

    expect(googleButton).toBeInTheDocument();
    expect(ssoButton).toBeInTheDocument();
    expect(magicLinkButton).toBeInTheDocument();
  });

  it("calls signInWithGoogle on button click", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(undefined);

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /signInWithGoogle/i });
    await user.click(googleButton);

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows error when sign-in fails", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockRejectedValue(new Error("Network error"));

    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /signInWithGoogle/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/google sign-in failed/i)).toBeInTheDocument();
    });
  });

  it("redirects to / when user is already signed in with role", () => {
    mockUseAuth.mockReturnValue({
      user: { sub: "user-1", email: "test@test.com", getToken: vi.fn() },
      loading: false,
    });
    mockUsePermissions.mockReturnValue({ role: "superadmin", loading: false });

    render(<LoginPage />);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("does not redirect when permissions are still loading", () => {
    mockUseAuth.mockReturnValue({
      user: { sub: "user-1", email: "test@test.com", getToken: vi.fn() },
      loading: false,
    });
    mockUsePermissions.mockReturnValue({ role: null, loading: true });

    render(<LoginPage />);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not redirect when user has no role", () => {
    mockUseAuth.mockReturnValue({
      user: { sub: "user-1", email: "test@test.com", getToken: vi.fn() },
      loading: false,
    });
    mockUsePermissions.mockReturnValue({ role: null, loading: false });

    render(<LoginPage />);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
