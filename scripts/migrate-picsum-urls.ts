/**
 * Migration script to find and report posts with picsum.photos URLs
 *
 * Prerequisites:
 *   1. Place your Firebase service account key at ./service-account-key.json
 *
 * Usage:
 *   npx tsx scripts/migrate-picsum-urls.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), "service-account-key.json");

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
const db = getFirestore();

async function findPicsumPosts() {
  console.log("Searching for posts with picsum.photos URLs...\n");

  const clientsSnapshot = await db.collection("clients").get();
  const postsWithPicsum: Array<{
    path: string;
    imageUrl: string;
    authorAvatarUrl?: string;
  }> = [];

  for (const clientDoc of clientsSnapshot.docs) {
    const eventsSnapshot = await db
      .collection(`clients/${clientDoc.id}/events`)
      .get();

    for (const eventDoc of eventsSnapshot.docs) {
      const postsSnapshot = await db
        .collection(`clients/${clientDoc.id}/events/${eventDoc.id}/posts`)
        .get();

      for (const postDoc of postsSnapshot.docs) {
        const data = postDoc.data();
        const hasPicsum =
          (data.imageUrl && data.imageUrl.includes("picsum.photos")) ||
          (data.authorAvatarUrl && data.authorAvatarUrl.includes("picsum.photos"));

        if (hasPicsum) {
          postsWithPicsum.push({
            path: `clients/${clientDoc.id}/events/${eventDoc.id}/posts/${postDoc.id}`,
            imageUrl: data.imageUrl,
            authorAvatarUrl: data.authorAvatarUrl,
          });
        }
      }
    }
  }

  return postsWithPicsum;
}

async function deletePosts(posts: Array<{ path: string }>) {
  console.log("\n🗑️  Deleting posts...\n");

  for (const post of posts) {
    try {
      await db.doc(post.path).delete();
      console.log(`✅ Deleted: ${post.path}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${post.path}:`, error);
    }
  }

  console.log("\n✅ Deletion complete!");
}

async function main() {
  const posts = await findPicsumPosts();

  if (posts.length === 0) {
    console.log("✅ No posts with picsum.photos URLs found!");
    return;
  }

  console.log(`Found ${posts.length} post(s) with picsum.photos URLs:\n`);

  for (const post of posts) {
    console.log(`📄 ${post.path}`);
    if (post.imageUrl?.includes("picsum.photos")) {
      console.log(`   imageUrl: ${post.imageUrl}`);
    }
    if (post.authorAvatarUrl?.includes("picsum.photos")) {
      console.log(`   authorAvatarUrl: ${post.authorAvatarUrl}`);
    }
    console.log();
  }

  // Check for DELETE=true environment variable
  if (process.env.DELETE === "true") {
    await deletePosts(posts);
  } else {
    console.log("\nTo delete these posts, run:");
    console.log("DELETE=true npx tsx scripts/migrate-picsum-urls.ts\n");
  }
}

main().catch(console.error);
