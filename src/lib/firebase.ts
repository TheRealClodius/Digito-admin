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

// Lazy getters — avoid initializing Firebase during static page generation
// when environment variables are not available (e.g. Vercel build step).
let _app: FirebaseApp;
let _auth: Auth;
let _db: Firestore;
let _storage: FirebaseStorage;

export function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

export function getAuthInstance(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getDbInstance(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export function getStorageInstance(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getApp());
  return _storage;
}
