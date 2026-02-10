import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Firebase modules before any imports
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockFirebaseSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) =>
    mockOnAuthStateChanged(...args),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

import { signIn, signInWithGoogle, signOut, checkSuperAdmin, onAuthChange } from "./auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("calls signInWithEmailAndPassword and returns the user", async () => {
      const mockUser = { uid: "123", email: "test@test.com" };
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await signIn("test@test.com", "password");

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        undefined, // auth instance is undefined in test context
        "test@test.com",
        "password"
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe("signInWithGoogle", () => {
    it("calls signInWithPopup and returns the user", async () => {
      const mockUser = { uid: "456", email: "google@test.com" };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });

      const result = await signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("throws when popup is cancelled", async () => {
      mockSignInWithPopup.mockRejectedValue(new Error("popup closed"));

      await expect(signInWithGoogle()).rejects.toThrow("popup closed");
    });
  });

  describe("signOut", () => {
    it("calls Firebase signOut", async () => {
      mockFirebaseSignOut.mockResolvedValue(undefined);

      await signOut();

      expect(mockFirebaseSignOut).toHaveBeenCalled();
    });
  });

  describe("checkSuperAdmin", () => {
    it("returns true when user has superadmin custom claim", async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { superadmin: true },
        }),
      } as unknown as import("firebase/auth").User;

      const result = await checkSuperAdmin(mockUser);

      expect(result).toBe(true);
      expect(mockUser.getIdTokenResult).toHaveBeenCalledWith(true); // Force refresh
    });

    it("returns true when user has legacy admin claim (backward compatibility)", async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: true },
        }),
      } as unknown as import("firebase/auth").User;

      const result = await checkSuperAdmin(mockUser);

      expect(result).toBe(true);
      expect(mockUser.getIdTokenResult).toHaveBeenCalledWith(true);
    });

    it("returns true when user has BOTH superadmin and admin claims", async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { superadmin: true, admin: true },
        }),
      } as unknown as import("firebase/auth").User;

      const result = await checkSuperAdmin(mockUser);

      expect(result).toBe(true);
    });

    it("returns false when user does not have superadmin or admin claim", async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: {},
        }),
      } as unknown as import("firebase/auth").User;

      const result = await checkSuperAdmin(mockUser);

      expect(result).toBe(false);
    });

    it("returns false when superadmin claim is false", async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { superadmin: false },
        }),
      } as unknown as import("firebase/auth").User;

      const result = await checkSuperAdmin(mockUser);

      expect(result).toBe(false);
    });

    it("returns false when only admin claim is false", async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: false },
        }),
      } as unknown as import("firebase/auth").User;

      const result = await checkSuperAdmin(mockUser);

      expect(result).toBe(false);
    });
  });

  describe("onAuthChange", () => {
    it("subscribes to auth state changes", () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const unsubscribe = onAuthChange(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(
        undefined, // auth instance is undefined in test context
        callback
      );
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  // Note: getUserPermissions tests are in a separate test file
  // since they require Firestore mocking which conflicts with these mocks
});
