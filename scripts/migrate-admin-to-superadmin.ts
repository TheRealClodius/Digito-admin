/**
 * One-time migration script: admin → superadmin
 *
 * This script migrates users from the legacy 'admin' claim to the new 'superadmin' claim.
 *
 * What it does:
 * 1. Lists all users with `admin: true` claim
 * 2. For allowed emails: sets `{ superadmin: true }` and creates userPermissions document
 * 3. For non-allowed emails: removes admin claim and reports security violation
 * 4. Validates and reports results
 *
 * SECURITY: Only emails in ALLOWED_SUPERADMINS can receive superadmin access.
 *
 * Usage:
 *   npx tsx scripts/migrate-admin-to-superadmin.ts
 *
 * Prerequisites:
 *   - service-account-key.json must exist in project root
 *   - Firebase Admin SDK access
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), "service-account-key.json");

// SECURITY: Hardcoded list of allowed superadmin emails (must match seed-admins.ts)
const ALLOWED_SUPERADMINS = [
  'andrei.clodius@goodgest.com',
  'ga.ibba@goodgest.com'
];

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
const auth = getAuth();
const db = getFirestore();

interface MigrationResult {
  migratedCount: number;
  skippedCount: number;
  removedCount: number;
  errorCount: number;
  migratedUsers: string[];
  skippedUsers: string[];
  removedUsers: string[];
  errors: Array<{ email: string; error: string }>;
}

async function migrateUser(uid: string, email: string, result: MigrationResult) {
  // SECURITY CHECK: Only allow emails in the approved list
  if (!ALLOWED_SUPERADMINS.includes(email)) {
    console.warn(`⚠️  SECURITY: ${email} has admin claim but is NOT in allowed list. Removing admin claim.`);

    try {
      // Remove admin claim from unauthorized user
      await auth.setCustomUserClaims(uid, { admin: false });
      result.removedCount++;
      result.removedUsers.push(email);
      console.log(`✅ Removed admin claim from ${email}`);
    } catch (error) {
      console.error(`❌ Failed to remove admin claim from ${email}:`, error);
      result.errorCount++;
      result.errors.push({ email, error: String(error) });
    }
    return;
  }

  try {
    // Set superadmin claim (keep admin for backward compatibility during transition)
    await auth.setCustomUserClaims(uid, {
      admin: true,      // Keep for backward compatibility
      superadmin: true  // New claim
    });

    // Create or update userPermissions document
    await db.collection("userPermissions").doc(uid).set({
      userId: uid,
      email: email,
      role: 'superadmin',
      clientIds: null,  // null = full access
      eventIds: null,   // null = full access
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      updatedBy: uid,
    });

    // Ensure superAdmins collection document exists
    await db.collection("superAdmins").doc(uid).set({ email });

    result.migratedCount++;
    result.migratedUsers.push(email);
    console.log(`✅ Migrated ${email} → superadmin: true + userPermissions created`);
  } catch (error) {
    console.error(`❌ Failed to migrate ${email}:`, error);
    result.errorCount++;
    result.errors.push({ email, error: String(error) });
  }
}

async function main() {
  console.log("\n========================================");
  console.log("Admin → Superadmin Migration");
  console.log("========================================\n");
  console.log(`Allowed superadmins: ${ALLOWED_SUPERADMINS.join(', ')}\n`);
  console.log("Scanning all Firebase Auth users for admin claims...\n");

  const result: MigrationResult = {
    migratedCount: 0,
    skippedCount: 0,
    removedCount: 0,
    errorCount: 0,
    migratedUsers: [],
    skippedUsers: [],
    removedUsers: [],
    errors: [],
  };

  // List all users and check for admin claim
  const listAllUsers = async (nextPageToken?: string): Promise<void> => {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);

    for (const userRecord of listUsersResult.users) {
      const claims = userRecord.customClaims || {};

      // Skip users who already have superadmin claim
      if (claims.superadmin === true) {
        console.log(`⏭️  Skipping ${userRecord.email} - already has superadmin claim`);
        result.skippedCount++;
        result.skippedUsers.push(userRecord.email || userRecord.uid);
        continue;
      }

      // Migrate users with admin claim
      if (claims.admin === true) {
        console.log(`🔄 Found admin user: ${userRecord.email}`);
        await migrateUser(userRecord.uid, userRecord.email || "", result);
      }
    }

    if (listUsersResult.pageToken) {
      await listAllUsers(listUsersResult.pageToken);
    }
  };

  await listAllUsers();

  // Print summary
  console.log("\n========================================");
  console.log("Migration Complete");
  console.log("========================================\n");

  console.log("📊 Summary:");
  console.log(`   ✅ Migrated: ${result.migratedCount} users`);
  console.log(`   ⏭️  Skipped: ${result.skippedCount} users (already have superadmin)`);
  console.log(`   ⚠️  Removed: ${result.removedCount} users (unauthorized admin claims)`);
  console.log(`   ❌ Errors: ${result.errorCount} users\n`);

  if (result.migratedUsers.length > 0) {
    console.log("✅ Successfully migrated:");
    result.migratedUsers.forEach(email => console.log(`   - ${email}`));
    console.log();
  }

  if (result.skippedUsers.length > 0) {
    console.log("⏭️  Skipped (already migrated):");
    result.skippedUsers.forEach(email => console.log(`   - ${email}`));
    console.log();
  }

  if (result.removedUsers.length > 0) {
    console.log("⚠️  Removed admin claims (security violation):");
    result.removedUsers.forEach(email => console.log(`   - ${email}`));
    console.log();
  }

  if (result.errors.length > 0) {
    console.log("❌ Errors:");
    result.errors.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`);
    });
    console.log();
  }

  console.log("========================================");
  console.log("\n✅ Next steps:");
  console.log("   1. Verify migration with: npx tsx scripts/check-admin-claim.ts <email>");
  console.log("   2. Test login with both superadmin emails");
  console.log("   3. Check /debug-auth page shows superadmin: true");
  console.log("   4. After 24-48h, run Stage 4 cleanup to remove legacy support\n");
}

main().catch(error => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
