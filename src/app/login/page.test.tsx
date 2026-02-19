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
const mockSignInWithEmailOTP = vi.fn();
const mockConfirmEmailOTP = vi.fn();
vi.mock("@/lib/auth", () => ({
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  signInWithEmailOTP: (...args: unknown[]) => mockSignInWithEmailOTP(...args),
  confirmEmailOTP: (...args: unknown[]) => mockConfirmEmailOTP(...args),
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
    t: (key: string, values?: Record<string, string>) => {
      if (values) {
        return key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? `{{${name}}}`);
      }
      return key;
    },
  }),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUsePermissions.mockReturnValue({ role: null, loading: false });
    // Mock the initiate-otp API call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
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

  describe("Email OTP flow", () => {
    it("shows email input when clicking magic link button", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const magicLinkButton = screen.getByRole("button", { name: /connectWithMagicLink/i });
      await user.click(magicLinkButton);

      expect(screen.getByPlaceholderText(/emailPlaceholder/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sendCode/i })).toBeInTheDocument();
    });

    it("returns to initial state when clicking back", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const magicLinkButton = screen.getByRole("button", { name: /connectWithMagicLink/i });
      await user.click(magicLinkButton);

      const backButton = screen.getByRole("button", { name: /backToLogin/i });
      await user.click(backButton);

      expect(screen.getByRole("button", { name: /connectWithMagicLink/i })).toBeInTheDocument();
    });

    it("calls signInWithEmailOTP on email submit", async () => {
      const user = userEvent.setup();
      mockSignInWithEmailOTP.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });

      render(<LoginPage />);

      const magicLinkButton = screen.getByRole("button", { name: /connectWithMagicLink/i });
      await user.click(magicLinkButton);

      const emailInput = screen.getByPlaceholderText(/emailPlaceholder/i);
      await user.type(emailInput, "test@example.com");

      const sendButton = screen.getByRole("button", { name: /sendCode/i });
      await user.click(sendButton);

      expect(mockSignInWithEmailOTP).toHaveBeenCalledWith("test@example.com");
    });

    it("shows OTP input after email is sent", async () => {
      const user = userEvent.setup();
      mockSignInWithEmailOTP.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });

      render(<LoginPage />);

      const magicLinkButton = screen.getByRole("button", { name: /connectWithMagicLink/i });
      await user.click(magicLinkButton);

      const emailInput = screen.getByPlaceholderText(/emailPlaceholder/i);
      await user.type(emailInput, "test@example.com");

      const sendButton = screen.getByRole("button", { name: /sendCode/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId("otp-input")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /verifyCode/i })).toBeInTheDocument();
      });
    });

    it("calls confirmEmailOTP when submitting OTP code", async () => {
      const user = userEvent.setup();
      mockSignInWithEmailOTP.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });
      mockConfirmEmailOTP.mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: "DONE" },
      });

      render(<LoginPage />);

      // Navigate to email step
      await user.click(screen.getByRole("button", { name: /connectWithMagicLink/i }));
      await user.type(screen.getByPlaceholderText(/emailPlaceholder/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /sendCode/i }));

      // Wait for OTP input to appear
      await waitFor(() => {
        expect(screen.getByTestId("otp-input")).toBeInTheDocument();
      });

      // Enter OTP code and verify
      const otpInput = screen.getByTestId("otp-input");
      await user.type(otpInput, "123456");
      await user.click(screen.getByRole("button", { name: /verifyCode/i }));

      expect(mockConfirmEmailOTP).toHaveBeenCalledWith("123456");
    });

    it("shows error when email OTP fails", async () => {
      const user = userEvent.setup();
      mockSignInWithEmailOTP.mockRejectedValue(new Error("User not found"));

      render(<LoginPage />);

      await user.click(screen.getByRole("button", { name: /connectWithMagicLink/i }));
      await user.type(screen.getByPlaceholderText(/emailPlaceholder/i), "bad@example.com");
      await user.click(screen.getByRole("button", { name: /sendCode/i }));

      await waitFor(() => {
        expect(screen.getByText(/User not found/i)).toBeInTheDocument();
      });
    });

    it("shows error when OTP verification fails", async () => {
      const user = userEvent.setup();
      mockSignInWithEmailOTP.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });
      mockConfirmEmailOTP.mockRejectedValue(new Error("Invalid code"));

      render(<LoginPage />);

      await user.click(screen.getByRole("button", { name: /connectWithMagicLink/i }));
      await user.type(screen.getByPlaceholderText(/emailPlaceholder/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /sendCode/i }));

      await waitFor(() => {
        expect(screen.getByTestId("otp-input")).toBeInTheDocument();
      });

      await user.type(screen.getByTestId("otp-input"), "000000");
      await user.click(screen.getByRole("button", { name: /verifyCode/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
      });
    });

    it("resets to email step and shows friendly message when Amplify SignInException occurs", async () => {
      const user = userEvent.setup();
      mockSignInWithEmailOTP.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });
      const sessionError = new Error("An error occurred during the sign in process.");
      sessionError.name = "SignInException";
      mockConfirmEmailOTP.mockRejectedValue(sessionError);

      render(<LoginPage />);

      await user.click(screen.getByRole("button", { name: /connectWithMagicLink/i }));
      await user.type(screen.getByPlaceholderText(/emailPlaceholder/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /sendCode/i }));

      await waitFor(() => {
        expect(screen.getByTestId("otp-input")).toBeInTheDocument();
      });

      await user.type(screen.getByTestId("otp-input"), "123456");
      await user.click(screen.getByRole("button", { name: /verifyCode/i }));

      await waitFor(() => {
        // Should go back to email input step
        expect(screen.getByPlaceholderText(/emailPlaceholder/i)).toBeInTheDocument();
        // Should show session expired message
        expect(screen.getByText(/login.sessionExpired/i)).toBeInTheDocument();
      });
    });
  });
});
