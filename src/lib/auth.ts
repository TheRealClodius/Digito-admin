import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getAuthInstance, getDbInstance } from "./firebase";
import type { UserPermissions, UserRole } from "@/types/permissions";

const googleProvider = new GoogleAuthProvider();

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getAuthInstance(), email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(getAuthInstance(), googleProvider);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(getAuthInstance());
}

/**
 * Check if user has superadmin custom claim
 * MIGRATION: During transition, accepts both 'superadmin' (new) and 'admin' (legacy)
 */
export async function checkSuperAdmin(user: User): Promise<boolean> {
  const tokenResult = await user.getIdTokenResult(true); // Force refresh
  return tokenResult.claims.superadmin === true || tokenResult.claims.admin === true;
}

/**
 * Check user's role from custom claims.
 * Returns the UserRole or null if no valid role is found.
 * Checks superadmin/admin claims first, then the 'role' claim.
 */
export async function checkUserRole(user: User): Promise<UserRole | null> {
  const tokenResult = await user.getIdTokenResult(true);
  const claims = tokenResult.claims;

  // Superadmin takes priority (includes legacy 'admin' claim)
  if (claims.superadmin === true || claims.admin === true) {
    return "superadmin";
  }

  // Check for clientAdmin or eventAdmin role claim
  const role = claims.role as string | undefined;
  if (role === "clientAdmin" || role === "eventAdmin") {
    return role;
  }

  return null;
}

/**
 * Fetch user permissions from Firestore
 * Returns null if no permissions document exists
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const permDoc = await getDoc(doc(getDbInstance(), "userPermissions", userId));

    if (!permDoc.exists()) {
      return null;
    }

    const data = permDoc.data();
    return {
      userId: data.userId,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      clientIds: data.clientIds || null,
      eventIds: data.eventIds || null,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    };
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return null;
  }
}

function parsePermissionsPayload(
  data: Record<string, unknown>
): UserPermissions {
  const p = data.permissions as Record<string, unknown> | undefined;
  if (!p) throw new Error("missing permissions payload");
  return {
    userId: p.userId as string,
    email: p.email as string,
    role: p.role as UserRole,
    clientIds: (p.clientIds as string[] | null) || null,
    eventIds: (p.eventIds as string[] | null) || null,
    createdAt: p.createdAt ? new Date(p.createdAt as string) : new Date(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt as string) : new Date(),
    createdBy: p.createdBy as string,
    updatedBy: p.updatedBy as string,
  };
}

/**
 * Client-side fallback: check claims then Firestore directly.
 * Used when the server-side Admin SDK is unavailable.
 */
async function verifyPermissionsClientSide(
  user: User
): Promise<{ role: UserRole | null; permissions: UserPermissions | null }> {
  const role = await checkUserRole(user);
  if (role === "superadmin") {
    return { role, permissions: null };
  }
  if (role) {
    const permissions = await getUserPermissions(user.uid);
    return { role, permissions };
  }
  // No claims — check Firestore directly (handles claim propagation delay)
  const permissions = await getUserPermissions(user.uid);
  if (permissions) {
    return { role: permissions.role, permissions };
  }
  return { role: null, permissions: null };
}

/**
 * Permission check via server-side Admin SDK, with client-side fallback.
 *
 * Primary path: calls /api/check-permissions (Admin SDK — can auto-heal
 * claims and migrate UID-mismatched docs).
 *
 * Fallback path: if the API is unreachable or the Admin SDK is not
 * configured (503), falls back to client-side claims + Firestore check
 * so that login still works.
 */
export async function verifyPermissions(
  user: User
): Promise<{ role: UserRole | null; permissions: UserPermissions | null }> {
  console.log(`[verifyPermissions] checking for uid=${user.uid} email=${user.email}`);

  try {
    const token = await user.getIdToken(true);
    const res = await fetch("/api/check-permissions", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      console.log("[verifyPermissions] server result:", {
        role: data.role,
        hasPermissions: !!data.permissions,
      });
      return {
        role: data.role ?? null,
        permissions: data.permissions ? parsePermissionsPayload(data) : null,
      };
    }

    // 401 = genuinely invalid token — no point falling back
    if (res.status === 401) {
      console.error("[verifyPermissions] Token rejected by server (401)");
      return { role: null, permissions: null };
    }

    // 503 / 500 = server-side issue — fall back to client
    const text = await res.text();
    console.warn(
      `[verifyPermissions] Server API error ${res.status}: ${text}. Using client-side fallback.`
    );
  } catch (err) {
    console.warn(
      `[verifyPermissions] Server API unreachable: ${err}. Using client-side fallback.`
    );
  }

  return verifyPermissionsClientSide(user);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
