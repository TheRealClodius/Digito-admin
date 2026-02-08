/**
 * One-time script to set admin custom claims and create superAdmins Firestore
 * documents for super admin users.
 *
 * Prerequisites:
 *   1. Place your Firebase service account key at ./service-account-key.json
 *      (download from Firebase Console → Project Settings → Service Accounts)
 *   2. All admin users should have signed in at least once (accounts must exist in Firebase Auth)
 *
 * Usage:
 *   ADMIN_EMAILS=admin1@example.com,admin2@example.com npx tsx scripts/seed-admins.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), "service-account-key.json");

// Read admin emails from environment variable
// Format: ADMIN_EMAILS=email1@example.com,email2@example.com
const adminEmailsEnv = process.env.ADMIN_EMAILS;
if (!adminEmailsEnv) {
  console.error(
    "ERROR: ADMIN_EMAILS environment variable is not set.\n" +
    "Usage: ADMIN_EMAILS=admin@example.com,admin2@example.com npx tsx scripts/seed-admins.ts"
  );
  process.exit(1);
}

const ADMIN_EMAILS = adminEmailsEnv.split(",").map((email) => email.trim()).filter(Boolean);

let serviceAccount: object;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
} catch {
  console.error(
    "Could not read service-account-key.json from project root.\n" +
    "Download it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key."
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
const auth = getAuth();
const db = getFirestore();

async function seedAdmin(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    await db.collection("superAdmins").doc(user.uid).set({ email });
    console.log(`Set admin claim + superAdmins doc for ${email} (uid: ${user.uid})`);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found") {
      console.warn(
        `User ${email} not found in Firebase Auth. ` +
        "They need to sign in with Google at least once before running this script."
      );
    } else {
      console.error(`Failed to set admin claim for ${email}:`, error);
    }
  }
}

async function main() {
  console.log("Seeding admin custom claims + Firestore superAdmins docs...\n");
  for (const email of ADMIN_EMAILS) {
    await seedAdmin(email);
  }
  console.log("\nDone.");
}

main();
