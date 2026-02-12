/**
 * Script to set superadmin custom claims and create userPermissions Firestore documents.
 *
 * Prerequisites:
 *   1. Place your Firebase service account key at ./service-account-key.json
 *      (download from Firebase Console → Project Settings → Service Accounts)
 *   2. All admin users should have signed in at least once (accounts must exist in Firebase Auth)
 *
 * Usage:
 *   ADMIN_EMAILS=admin1@example.com,admin2@example.com npx tsx scripts/seed-admins.ts
 *
 * Security:
 *   Only emails in ALLOWED_SUPERADMINS can be granted superadmin access.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), "service-account-key.json");

// SECURITY: Hardcoded list of allowed superadmin emails
const ALLOWED_SUPERADMINS = [
  'andrei.clodius@goodgest.com',
  'ga.ibba@goodgest.com',
  'simone.marra@goodgest.com'
];

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

async function seedSuperAdmin(email: string) {
  // SECURITY CHECK: Only allow emails in the approved list
  if (!ALLOWED_SUPERADMINS.includes(email)) {
    console.error(`❌ SECURITY: ${email} is NOT in the allowed superadmin list. Skipping.`);
    console.error(`   Allowed superadmins: ${ALLOWED_SUPERADMINS.join(', ')}`);
    return;
  }

  try {
    const user = await auth.getUserByEmail(email);

    await auth.setCustomUserClaims(user.uid, {
      superadmin: true,
    });

    // Create userPermissions document
    await db.collection("userPermissions").doc(user.uid).set({
      userId: user.uid,
      email: user.email,
      role: 'superadmin',
      clientIds: null,  // null = full access
      eventIds: null,   // null = full access
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    console.log(`✅ Set superadmin claims + userPermissions for ${email} (uid: ${user.uid})`);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found") {
      console.warn(
        `⚠️  User ${email} not found in Firebase Auth. ` +
        "They need to sign in with Google at least once before running this script."
      );
    } else {
      console.error(`❌ Failed to set superadmin for ${email}:`, error);
    }
  }
}

async function main() {
  console.log("\n========================================");
  console.log("Seeding Superadmin Claims + Permissions");
  console.log("========================================\n");
  console.log(`Allowed superadmins: ${ALLOWED_SUPERADMINS.join(', ')}\n`);

  for (const email of ADMIN_EMAILS) {
    await seedSuperAdmin(email);
  }

  console.log("\n========================================");
  console.log("Done");
  console.log("========================================\n");
}

main();
