import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAmplifySignIn = vi.fn();
const mockSignInWithRedirect = vi.fn();
const mockAmplifySignOut = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockFetchAuthSession = vi.fn();

vi.mock("aws-amplify/auth", () => ({
  signIn: (...args: unknown[]) => mockAmplifySignIn(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  signOut: (...args: unknown[]) => mockAmplifySignOut(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
}));

vi.mock("./amplify-config", () => ({
  ensureAmplifyConfigured: vi.fn(),
}));

import { signIn, signInWithGoogle, signOut, getCurrentAuthUser, verifyPermissions } from "./auth";

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
