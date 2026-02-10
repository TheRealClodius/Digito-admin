/**
 * Debug script to check Firebase custom claims and userPermissions for a user
 *
 * Usage:
 *   npx tsx scripts/check-admin-claim.ts <email>
 *   npx tsx scripts/check-admin-claim.ts andrei.clodius@goodgest.com
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), "service-account-key.json");

// CLI argument handling
const email = process.argv[2];
if (!email) {
  console.error("❌ ERROR: Email argument is required\n");
  console.error("Usage: npx tsx scripts/check-admin-claim.ts <email>\n");
  console.error("Example: npx tsx scripts/check-admin-claim.ts andrei.clodius@goodgest.com\n");
  process.exit(1);
}

let serviceAccount: object;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
} catch {
  console.error(
    "❌ Could not read service-account-key.json from project root.\n" +
    "Download it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key."
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });

async function checkClaim(email: string) {
  const auth = getAuth();
  const db = getFirestore();

  try {
    const user = await auth.getUserByEmail(email);
    const claims = user.customClaims || {};

    // Fetch userPermissions document
    const permDoc = await db.collection("userPermissions").doc(user.uid).get();
    const permissions = permDoc.exists ? permDoc.data() : null;

    console.log("\n========================================");
    console.log("Superadmin Check");
    console.log("========================================\n");

    console.log("📧 Email:", user.email);
    console.log("🆔 UID:", user.uid);

    console.log("\n--- Custom Claims ---");
    console.log(JSON.stringify(claims, null, 2));

    console.log("\n--- Claim Status ---");
    console.log("Has superadmin claim:", claims.superadmin === true ? "✅ YES" : "❌ NO");
    console.log("Has legacy admin claim:", claims.admin === true ? "✅ YES" : "❌ NO");

    const isSuperAdmin = claims.superadmin === true || claims.admin === true;
    console.log("\n🔐 Overall Status:", isSuperAdmin ? "✅ SUPERADMIN" : "❌ NOT SUPERADMIN");

    console.log("\n--- userPermissions Document ---");
    if (permissions) {
      console.log(JSON.stringify(permissions, null, 2));
    } else {
      console.log("⚠️  No userPermissions document found");
    }

    console.log("\n========================================\n");
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found") {
      console.error(`\n❌ User ${email} not found in Firebase Auth.\n`);
    } else {
      console.error(`\n❌ Error checking claim:`, error, "\n");
    }
    process.exit(1);
  }
}

checkClaim(email);
