import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve } from "path";

const SERVICE_ACCOUNT_PATH = resolve(process.cwd(), "service-account-key.json");
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));

initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });

async function checkClaim() {
  const auth = getAuth();
  const user = await auth.getUserByEmail("andrei.clodius@goodgest.com");
  const claims = user.customClaims;

  console.log("\n=== Admin Claim Check ===");
  console.log("Email:", user.email);
  console.log("UID:", user.uid);
  console.log("Custom claims:", JSON.stringify(claims, null, 2));
  console.log("Has admin claim:", claims?.admin === true ? "✅ YES" : "❌ NO");
  console.log("========================\n");
}

checkClaim();
