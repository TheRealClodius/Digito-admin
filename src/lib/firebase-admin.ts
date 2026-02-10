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
