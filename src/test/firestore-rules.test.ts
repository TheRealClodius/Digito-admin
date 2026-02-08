import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ID = "digito-rules-test";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = resolve(__dirname, "../../firestore.rules");
  const rules = readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("Firestore security rules", () => {
  describe("clients collection", () => {
    it("denies read access to non-admin authenticated users", async () => {
      const regularUser = testEnv.authenticatedContext("regular-user");
      const clientDoc = doc(regularUser.firestore(), "clients", "client-1");
      await assertFails(getDoc(clientDoc));
    });

    it("allows read access to super admins", async () => {
      const admin = testEnv.authenticatedContext("admin-user", {
        admin: true,
      });
      const clientDoc = doc(admin.firestore(), "clients", "client-1");
      await assertSucceeds(getDoc(clientDoc));
    });

    it("denies read access to unauthenticated users", async () => {
      const unauthenticated = testEnv.unauthenticatedContext();
      const clientDoc = doc(
        unauthenticated.firestore(),
        "clients",
        "client-1"
      );
      await assertFails(getDoc(clientDoc));
    });
  });

  describe("events collection", () => {
    it("allows read access to authenticated users", async () => {
      const regularUser = testEnv.authenticatedContext("regular-user");
      const eventDoc = doc(
        regularUser.firestore(),
        "clients/client-1/events",
        "event-1"
      );
      await assertSucceeds(getDoc(eventDoc));
    });

    it("denies read access to unauthenticated users", async () => {
      const unauthenticated = testEnv.unauthenticatedContext();
      const eventDoc = doc(
        unauthenticated.firestore(),
        "clients/client-1/events",
        "event-1"
      );
      await assertFails(getDoc(eventDoc));
    });
  });

  describe("whitelist collection", () => {
    it("allows read access to authenticated users (needed for auth flow)", async () => {
      const regularUser = testEnv.authenticatedContext("regular-user");
      const whitelistDoc = doc(
        regularUser.firestore(),
        "clients/client-1/events/event-1/whitelist",
        "entry-1"
      );
      await assertSucceeds(getDoc(whitelistDoc));
    });
  });

  describe("event subcollections", () => {
    it("allows authenticated users to read brands", async () => {
      const regularUser = testEnv.authenticatedContext("regular-user");
      const brandDoc = doc(
        regularUser.firestore(),
        "clients/client-1/events/event-1/brands",
        "brand-1"
      );
      await assertSucceeds(getDoc(brandDoc));
    });

    it("denies write access for non-admin users", async () => {
      const regularUser = testEnv.authenticatedContext("regular-user");
      const brandDoc = doc(
        regularUser.firestore(),
        "clients/client-1/events/event-1/brands",
        "brand-1"
      );
      const { setDoc } = await import("firebase/firestore");
      await assertFails(setDoc(brandDoc, { name: "hack" }));
    });
  });

  describe("clients write access", () => {
    it("denies write access to non-admin authenticated users", async () => {
      const regularUser = testEnv.authenticatedContext("regular-user");
      const clientDoc = doc(regularUser.firestore(), "clients", "client-1");
      const { setDoc } = await import("firebase/firestore");
      await assertFails(setDoc(clientDoc, { name: "hack" }));
    });

    it("allows write access to super admins", async () => {
      const admin = testEnv.authenticatedContext("admin-user", {
        admin: true,
      });
      const clientDoc = doc(admin.firestore(), "clients", "client-1");
      const { setDoc } = await import("firebase/firestore");
      await assertSucceeds(setDoc(clientDoc, { name: "legit" }));
    });
  });
});
