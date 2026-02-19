"use client";

import {
  signIn as amplifySignIn,
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  confirmSignIn,
} from "aws-amplify/auth";
import type { SignInOutput } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "./amplify-config";
import type { UserPermissions, UserRole } from "@/types/permissions";

/** Provider-agnostic auth user type used throughout the app */
export interface AuthUser {
  sub: string;
  email: string | null;
  getToken(): Promise<string>;
}

/** Sign in with email and password via Cognito */
export async function signIn(email: string, password: string): Promise<void> {
  ensureAmplifyConfigured();
  await amplifySignIn({ username: email, password });
}

/** Sign in with email OTP (custom auth challenge — sends 6-digit code via SES) */
export async function signInWithEmailOTP(email: string): Promise<SignInOutput> {
  ensureAmplifyConfigured();
  try {
    // Clear any stale Amplify session before starting the OTP flow.
    // Without this, a leftover session (e.g. from Google OAuth or a previous
    // OTP attempt) can corrupt the signInStore and cause confirmSignIn to fail
    // with "signIn was not called before confirmSignIn".
    await amplifySignOut({ global: false });
  } catch {
    // Ignore — no active session to clear is fine
  }
  return amplifySignIn({
    username: email,
    options: { authFlowType: "CUSTOM_WITHOUT_SRP" },
  });
}

/** Confirm email OTP code (completes custom auth challenge) */
export async function confirmEmailOTP(code: string): Promise<SignInOutput> {
  ensureAmplifyConfigured();
  return confirmSignIn({ challengeResponse: code });
}

/** Sign in with Google OAuth (redirect flow — browser navigates away) */
export async function signInWithGoogle(): Promise<void> {
  ensureAmplifyConfigured();
  try {
    // Clear any stale Amplify session (stored in localStorage) before redirecting.
    // Without this, Amplify throws "There is already a signed in user".
    await amplifySignOut({ global: false });
  } catch {
    // Ignore — no active session to clear is fine
  }
  await signInWithRedirect({ provider: "Google" });
}

/** Sign out from Cognito */
export async function signOut(): Promise<void> {
  ensureAmplifyConfigured();
  await amplifySignOut();
}

/**
 * Get the current authenticated user as an AuthUser.
 * Returns null if not authenticated.
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  ensureAmplifyConfigured();
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    if (!accessToken) return null;

    // loginId is available for email/password and OTP flows but null for Google OAuth.
    // Fall back to fetchUserAttributes to get the email attribute.
    let email: string | null = user.signInDetails?.loginId || null;
    if (!email) {
      try {
        const attrs = await fetchUserAttributes();
        email = attrs.email || null;
      } catch {
        // Attributes unavailable — email stays null
      }
    }

    return {
      sub: user.userId,
      email,
      getToken: async () => {
        const s = await fetchAuthSession({ forceRefresh: false });
        return s.tokens?.accessToken?.toString() || "";
      },
    };
  } catch {
    return null;
  }
}

/**
 * Server-side permission check via API route.
 * Calls /api/check-permissions with the Cognito access token.
 * Returns { role, permissions } or { role: null } if no permissions found.
 */
export async function verifyPermissions(
  user: AuthUser
): Promise<{ role: UserRole | null; permissions: UserPermissions | null }> {
  const token = await user.getToken();
  const res = await fetch("/api/check-permissions", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[verifyPermissions] API returned ${res.status}: ${text}`
    );
    if (res.status >= 500) {
      throw new Error(`Permission check failed (server error ${res.status})`);
    }
    return { role: null, permissions: null };
  }

  const data = await res.json();
  return {
    role: data.role ?? null,
    permissions: data.permissions
      ? {
          userId: data.permissions.userId || data.permissions.cognitoSub || user.sub,
          cognitoSub: data.permissions.cognitoSub || user.sub,
          email: data.permissions.email,
          role: data.permissions.role,
          clientIds: data.permissions.clientIds || null,
          eventCodes: data.permissions.eventCodes || null,
          createdAt: data.permissions.createdAt
            ? new Date(data.permissions.createdAt)
            : new Date(),
          updatedAt: data.permissions.updatedAt
            ? new Date(data.permissions.updatedAt)
            : new Date(),
          createdBy: data.permissions.createdBy,
          updatedBy: data.permissions.updatedBy,
        }
      : null,
  };
}
