import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAmplifySignIn = vi.fn();
const mockSignInWithRedirect = vi.fn();
const mockAmplifySignOut = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockFetchAuthSession = vi.fn();
const mockConfirmSignIn = vi.fn();
const mockFetchUserAttributes = vi.fn();

vi.mock("aws-amplify/auth", () => ({
  signIn: (...args: unknown[]) => mockAmplifySignIn(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  signOut: (...args: unknown[]) => mockAmplifySignOut(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
  confirmSignIn: (...args: unknown[]) => mockConfirmSignIn(...args),
  fetchUserAttributes: (...args: unknown[]) => mockFetchUserAttributes(...args),
}));

vi.mock("./amplify-config", () => ({
  ensureAmplifyConfigured: vi.fn(),
}));

import { signIn, signInWithGoogle, signOut, getCurrentAuthUser, verifyPermissions, signInWithEmailOTP, confirmEmailOTP } from "./auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("calls Amplify signIn with username and password", async () => {
      mockAmplifySignIn.mockResolvedValue({});

      await signIn("test@test.com", "password");

      expect(mockAmplifySignIn).toHaveBeenCalledWith({
        username: "test@test.com",
        password: "password",
      });
    });
  });

  describe("signInWithGoogle", () => {
    it("calls signInWithRedirect with Google provider", async () => {
      mockSignInWithRedirect.mockResolvedValue(undefined);

      await signInWithGoogle();

      expect(mockSignInWithRedirect).toHaveBeenCalledWith({
        provider: "Google",
      });
    });
  });

  describe("signOut", () => {
    it("calls Amplify signOut", async () => {
      mockAmplifySignOut.mockResolvedValue(undefined);

      await signOut();

      expect(mockAmplifySignOut).toHaveBeenCalled();
    });
  });

  describe("getCurrentAuthUser", () => {
    it("returns AuthUser when authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: "sub-123",
        signInDetails: { loginId: "test@test.com" },
      });
      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: { toString: () => "mock-access-token" },
        },
      });

      const user = await getCurrentAuthUser();

      expect(user).not.toBeNull();
      expect(user!.sub).toBe("sub-123");
      expect(user!.email).toBe("test@test.com");
    });

    it("returns null when not authenticated", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Not signed in"));

      const user = await getCurrentAuthUser();

      expect(user).toBeNull();
    });

    it("returns null when no access token", async () => {
      mockGetCurrentUser.mockResolvedValue({ userId: "sub-123" });
      mockFetchAuthSession.mockResolvedValue({ tokens: {} });

      const user = await getCurrentAuthUser();

      expect(user).toBeNull();
    });

    it("falls back to fetchUserAttributes for email when loginId is missing (Google OAuth)", async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: "google-sub-123",
        signInDetails: { loginId: undefined },
      });
      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: { toString: () => "mock-access-token" },
        },
      });
      mockFetchUserAttributes.mockResolvedValue({ email: "simone@google.com" });

      const user = await getCurrentAuthUser();

      expect(user).not.toBeNull();
      expect(user!.email).toBe("simone@google.com");
      expect(mockFetchUserAttributes).toHaveBeenCalled();
    });

    it("returns null email gracefully when both loginId and fetchUserAttributes fail", async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: "google-sub-123",
        signInDetails: {},
      });
      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: { toString: () => "mock-access-token" },
        },
      });
      mockFetchUserAttributes.mockRejectedValue(new Error("Attributes unavailable"));

      const user = await getCurrentAuthUser();

      expect(user).not.toBeNull();
      expect(user!.email).toBeNull();
    });
  });

  describe("signInWithEmailOTP", () => {
    it("calls signOut before signIn to clear any stale session", async () => {
      const callOrder: string[] = [];
      mockAmplifySignOut.mockImplementation(async () => { callOrder.push("signOut"); });
      mockAmplifySignIn.mockImplementation(async () => {
        callOrder.push("signIn");
        return { isSignedIn: false, nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" } };
      });

      await signInWithEmailOTP("user@test.com");

      expect(callOrder[0]).toBe("signOut");
      expect(callOrder[1]).toBe("signIn");
    });

    it("proceeds even if signOut fails (no existing session)", async () => {
      mockAmplifySignOut.mockRejectedValue(new Error("No session to sign out"));
      mockAmplifySignIn.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });

      const result = await signInWithEmailOTP("user@test.com");

      expect(mockAmplifySignIn).toHaveBeenCalledWith({
        username: "user@test.com",
        options: { authFlowType: "CUSTOM_WITHOUT_SRP" },
      });
      expect(result.isSignedIn).toBe(false);
    });

    it("calls Amplify signIn with CUSTOM_WITHOUT_SRP auth flow", async () => {
      mockAmplifySignOut.mockResolvedValue(undefined);
      mockAmplifySignIn.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE" },
      });

      const result = await signInWithEmailOTP("user@test.com");

      expect(mockAmplifySignIn).toHaveBeenCalledWith({
        username: "user@test.com",
        options: { authFlowType: "CUSTOM_WITHOUT_SRP" },
      });
      expect(result.isSignedIn).toBe(false);
      expect(result.nextStep.signInStep).toBe("CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE");
    });
  });

  describe("confirmEmailOTP", () => {
    it("calls confirmSignIn with the OTP code", async () => {
      mockConfirmSignIn.mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: "DONE" },
      });

      const result = await confirmEmailOTP("123456");

      expect(mockConfirmSignIn).toHaveBeenCalledWith({
        challengeResponse: "123456",
      });
      expect(result.isSignedIn).toBe(true);
    });
  });

  describe("verifyPermissions", () => {
    it("calls /api/check-permissions with Bearer token", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          role: "superadmin",
          permissions: null,
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const user = {
        sub: "sub-123",
        email: "test@test.com",
        getToken: vi.fn().mockResolvedValue("mock-token"),
      };

      const result = await verifyPermissions(user);

      expect(global.fetch).toHaveBeenCalledWith("/api/check-permissions", {
        headers: { Authorization: "Bearer mock-token" },
      });
      expect(result.role).toBe("superadmin");
      expect(result.permissions).toBeNull();
    });

    it("returns permissions when they exist", async () => {
      const mockPerms = {
        cognitoSub: "sub-123",
        email: "admin@test.com",
        role: "clientAdmin",
        clientIds: ["client-1"],
        eventCodes: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "creator",
        updatedBy: "creator",
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ role: "clientAdmin", permissions: mockPerms }),
      });

      const user = {
        sub: "sub-123",
        email: "admin@test.com",
        getToken: vi.fn().mockResolvedValue("mock-token"),
      };

      const result = await verifyPermissions(user);
      expect(result.role).toBe("clientAdmin");
      expect(result.permissions).not.toBeNull();
      expect(result.permissions!.clientIds).toEqual(["client-1"]);
    });

    it("returns null role on 403", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
      });

      const user = {
        sub: "sub-123",
        email: "test@test.com",
        getToken: vi.fn().mockResolvedValue("mock-token"),
      };

      const result = await verifyPermissions(user);
      expect(result.role).toBeNull();
    });

    it("throws on 500 errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const user = {
        sub: "sub-123",
        email: "test@test.com",
        getToken: vi.fn().mockResolvedValue("mock-token"),
      };

      await expect(verifyPermissions(user)).rejects.toThrow("server error");
    });
  });
});
