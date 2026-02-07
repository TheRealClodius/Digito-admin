import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function checkSuperAdmin(uid: string): Promise<boolean> {
  const adminDoc = await getDoc(doc(db, "superAdmins", uid));
  return adminDoc.exists();
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
