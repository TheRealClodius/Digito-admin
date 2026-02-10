/**
 * Migration script: Add isActive field to all existing event user docs.
 *
 * Sets isActive: true on all user docs that don't have the field yet.
 * This is needed for Firestore rules that gate access on isActive.
 *
 * Usage:
 *   npx tsx scripts/add-is-active-field.ts
 *
 * Prerequisites:
 *   - Place service-account-key.json in project root
 *   - Run in dry-run mode first (DRY_RUN=true)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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
    `\n${"=".repeat(50)}\nMigrate: Add isActive field to event users\n${DRY_RUN ? "** DRY RUN — no changes will be made **" : "** LIVE RUN **"}\n${"=".repeat(50)}\n`
  );

  const clientsSnap = await db.collection("clients").get();
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const clientDoc of clientsSnap.docs) {
    const eventsSnap = await db
      .collection(`clients/${clientDoc.id}/events`)
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const usersSnap = await db
        .collection(
          `clients/${clientDoc.id}/events/${eventDoc.id}/users`
        )
        .get();

      for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        if (data.isActive !== undefined) {
          totalSkipped++;
          continue;
        }

        console.log(
          `  ${DRY_RUN ? "[DRY]" : "[SET]"} ${clientDoc.id}/${eventDoc.id}/users/${userDoc.id} → isActive: true`
        );

        if (!DRY_RUN) {
          await userDoc.ref.update({ isActive: true });
        }
        totalUpdated++;
      }
    }
  }

  console.log(
    `\nDone. Updated: ${totalUpdated}, Skipped (already had isActive): ${totalSkipped}`
  );
}

migrate().catch(console.error);
