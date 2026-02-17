"use client";

import {
  signIn as amplifySignIn,
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
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

/** Sign in with Google OAuth (redirect flow — browser navigates away) */
export async function signInWithGoogle(): Promise<void> {
  ensureAmplifyConfigured();
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

    return {
      sub: user.userId,
      email: user.signInDetails?.loginId || null,
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
