import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

// Lazy singletons — avoid initializing Firebase during static page generation
// when environment variables are not available (e.g. Vercel build step).
let _auth: Auth;
let _db: Firestore;
let _storage: FirebaseStorage;

export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) { _auth ??= getAuth(getApp()); return Reflect.get(_auth, prop); },
});
export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) { _db ??= getFirestore(getApp()); return Reflect.get(_db, prop); },
});
export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) { _storage ??= getStorage(getApp()); return Reflect.get(_storage, prop); },
});

export default new Proxy({} as FirebaseApp, {
  get(_, prop) { return Reflect.get(getApp(), prop); },
});
