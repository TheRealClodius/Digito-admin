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

/**
 * Server-side permission check via Admin SDK.
 * Bypasses client-side Firestore rules and auto-heals missing claims.
 * Returns { role, permissions } or { role: null } if no permissions found.
 */
export async function verifyPermissions(
  user: User
): Promise<{ role: UserRole | null; permissions: UserPermissions | null }> {
  console.log(`[verifyPermissions] checking for uid=${user.uid} email=${user.email}`);
  const token = await user.getIdToken(true);
  const res = await fetch("/api/check-permissions", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[verifyPermissions] API returned ${res.status}: ${text}`);
    if (res.status >= 500) {
      throw new Error(`Permission check failed (server error ${res.status})`);
    }
    return { role: null, permissions: null };
  }

  const data = await res.json();
  console.log(`[verifyPermissions] result:`, { role: data.role, hasPermissions: !!data.permissions });
  return {
    role: data.role ?? null,
    permissions: data.permissions
      ? {
          userId: data.permissions.userId,
          email: data.permissions.email,
          role: data.permissions.role,
          clientIds: data.permissions.clientIds || null,
          eventIds: data.permissions.eventIds || null,
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

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
