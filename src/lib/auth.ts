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
import type { UserPermissions } from "@/types/permissions";

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

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
