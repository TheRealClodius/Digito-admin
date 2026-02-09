import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { getAuthInstance } from "./firebase";

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

export async function checkSuperAdmin(user: User): Promise<boolean> {
  const tokenResult = await user.getIdTokenResult(true);
  return tokenResult.claims.admin === true;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
