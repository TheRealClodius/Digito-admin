import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function ensureInitialized() {
  if (getApps().length > 0) return;

  // Environment variables take priority (deployment)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
    return;
  }

  // Fall back to service account file (local development)
  /* eslint-disable @typescript-eslint/no-require-imports */
  const fs = require("fs");
  const path = require("path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const serviceAccountPath = path.resolve(
    process.cwd(),
    "service-account-key.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    const missing = [
      !projectId && "FIREBASE_ADMIN_PROJECT_ID",
      !clientEmail && "FIREBASE_ADMIN_CLIENT_EMAIL",
      !privateKey && "FIREBASE_ADMIN_PRIVATE_KEY",
    ].filter(Boolean);
    throw new Error(
      `Firebase Admin SDK not configured. Missing env vars: ${missing.join(", ")}. ` +
      `Set these in your deployment environment or place service-account-key.json in the project root for local development.`
    );
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf-8")
  );
  initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminAuth() {
  ensureInitialized();
  return getAuth();
}

export function getAdminDb() {
  ensureInitialized();
  return getFirestore();
}
