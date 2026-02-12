/**
 * Migration script: Rename session access fields to match Flutter contract.
 *
 * Renames:
 *   requiresRegistration → requiresAccess
 *   requiresVIPAccess: true → accessTier: "vip"
 *
 * Also removes the old field names after migration.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/migrate-session-access-fields.ts
 *   npx tsx scripts/migrate-session-access-fields.ts
 *
 * Prerequisites:
 *   - Place service-account-key.json in project root
 *   - Run in dry-run mode first (DRY_RUN=true)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const DRY_RUN = process.env.DRY_RUN === "true";
const SERVICE_ACCOUNT_PATH = resolve(
  process.cwd(),
  "service-account-key.json"
);

const serviceAccount = JSON.parse(
  readFileSync(SERVICE_ACCOUNT_PATH, "utf-8")
);
initializeApp({
  credential: cert(serviceAccount as Parameters<typeof cert>[0]),
});
const db = getFirestore();

async function migrate() {
  console.log(
    `\n${"=".repeat(60)}\nMigrate: Session access fields → Flutter contract\n${DRY_RUN ? "** DRY RUN — no changes will be made **" : "** LIVE RUN **"}\n${"=".repeat(60)}\n`
  );

  const clientsSnap = await db.collection("clients").get();
  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const clientDoc of clientsSnap.docs) {
    const eventsSnap = await db
      .collection(`clients/${clientDoc.id}/events`)
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const sessionsSnap = await db
        .collection(
          `clients/${clientDoc.id}/events/${eventDoc.id}/sessions`
        )
        .get();

      for (const sessionDoc of sessionsSnap.docs) {
        const data = sessionDoc.data();
        const hasOldFields =
          data.requiresRegistration !== undefined ||
          data.requiresVIPAccess !== undefined;

        if (!hasOldFields) {
          totalSkipped++;
          continue;
        }

        // Map old fields to new fields
        const updates: Record<string, unknown> = {};

        // requiresRegistration → requiresAccess
        if (data.requiresRegistration !== undefined) {
          // If requiresAccess already exists, don't overwrite it
          if (data.requiresAccess === undefined) {
            updates.requiresAccess = data.requiresRegistration === true;
          }
          updates.requiresRegistration = FieldValue.delete();
        }

        // requiresVIPAccess: true → accessTier: "vip"
        if (data.requiresVIPAccess !== undefined) {
          if (data.requiresVIPAccess === true && data.accessTier === undefined) {
            updates.accessTier = "vip";
            // Also ensure requiresAccess is true if VIP was required
            if (data.requiresAccess === undefined && updates.requiresAccess === undefined) {
              updates.requiresAccess = true;
            }
          }
          updates.requiresVIPAccess = FieldValue.delete();
        }

        const path = `clients/${clientDoc.id}/events/${eventDoc.id}/sessions/${sessionDoc.id}`;
        const updateKeys = Object.keys(updates).filter(
          (k) => !(updates[k] instanceof FieldValue)
        );
        const deleteKeys = Object.keys(updates).filter(
          (k) => updates[k] instanceof FieldValue
        );

        console.log(
          `  ${DRY_RUN ? "[DRY]" : "[UPD]"} ${path}`
        );
        if (updateKeys.length > 0) {
          console.log(
            `    Set: ${updateKeys.map((k) => `${k}=${JSON.stringify(updates[k])}`).join(", ")}`
          );
        }
        if (deleteKeys.length > 0) {
          console.log(`    Delete: ${deleteKeys.join(", ")}`);
        }

        if (!DRY_RUN) {
          await sessionDoc.ref.update(updates);
        }
        totalMigrated++;
      }
    }
  }

  console.log(
    `\nDone. Migrated: ${totalMigrated}, Skipped (no old fields): ${totalSkipped}`
  );
}

migrate().catch(console.error);
