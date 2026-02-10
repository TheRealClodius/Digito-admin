/**
 * Comprehensive Firestore security rules tests
 *
 * Requires the Firestore emulator running on port 8080:
 *   firebase emulators:start --only firestore
 *
 * Auth contexts tested:
 * - SuperAdmin: { superadmin: true } custom claim
 * - ClientAdmin (assigned): { role: 'clientAdmin' } with clientIds: ['client-1']
 * - ClientAdmin (unassigned): { role: 'clientAdmin' } with clientIds: ['client-2']
 * - EventAdmin (assigned): { role: 'eventAdmin' } with eventIds: ['event-1']
 * - EventAdmin (unassigned): { role: 'eventAdmin' } with eventIds: ['event-2']
 * - Active Flutter user: auth only, has user doc with isActive: true
 * - Deactivated Flutter user: auth only, has user doc with isActive: false
 * - Unregistered auth user: auth only, no user doc
 * - Unauthenticated: no auth
 */
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ID = "digito-rules-test";

let testEnv: RulesTestEnvironment;

// === Auth context helpers ===

function superadminCtx() {
  return testEnv.authenticatedContext("superadmin-user", {
    superadmin: true,
  });
}

function clientAdminCtx() {
  return testEnv.authenticatedContext("clientadmin-user", {
    role: "clientAdmin",
  });
}

function unassignedClientAdminCtx() {
  return testEnv.authenticatedContext("unassigned-clientadmin", {
    role: "clientAdmin",
  });
}

function eventAdminCtx() {
  return testEnv.authenticatedContext("eventadmin-user", {
    role: "eventAdmin",
  });
}

function unassignedEventAdminCtx() {
  return testEnv.authenticatedContext("unassigned-eventadmin", {
    role: "eventAdmin",
  });
}

function flutterUserCtx() {
  return testEnv.authenticatedContext("flutter-user");
}

function deactivatedUserCtx() {
  return testEnv.authenticatedContext("deactivated-user");
}

function unregisteredUserCtx() {
  return testEnv.authenticatedContext("unregistered-user");
}

function unauthCtx() {
  return testEnv.unauthenticatedContext();
}

// === Setup / Teardown ===

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

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // --- userPermissions docs (scoping data for admin roles) ---
    await setDoc(doc(db, "userPermissions", "clientadmin-user"), {
      userId: "clientadmin-user",
      email: "clientadmin@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
    });
    await setDoc(doc(db, "userPermissions", "eventadmin-user"), {
      userId: "eventadmin-user",
      email: "eventadmin@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1"],
    });
    await setDoc(doc(db, "userPermissions", "unassigned-clientadmin"), {
      userId: "unassigned-clientadmin",
      email: "unassigned-ca@test.com",
      role: "clientAdmin",
      clientIds: ["client-2"],
    });
    await setDoc(doc(db, "userPermissions", "unassigned-eventadmin"), {
      userId: "unassigned-eventadmin",
      email: "unassigned-ea@test.com",
      role: "eventAdmin",
      clientIds: ["client-2"],
      eventIds: ["event-2"],
    });

    // --- Client + Event ---
    await setDoc(doc(db, "clients", "client-1"), { name: "Test Client" });
    await setDoc(doc(db, "clients/client-1/events", "event-1"), {
      name: "Test Event",
    });

    // --- Event content ---
    await setDoc(
      doc(db, "clients/client-1/events/event-1/brands", "brand-1"),
      { name: "Test Brand" }
    );
    await setDoc(
      doc(db, "clients/client-1/events/event-1/sessions", "session-1"),
      { title: "Test Session" }
    );
    await setDoc(
      doc(db, "clients/client-1/events/event-1/whitelist", "wl-1"),
      { email: "flutter@test.com", accessTier: "standard" }
    );

    // --- Flutter user docs ---
    await setDoc(
      doc(db, "clients/client-1/events/event-1/users", "flutter-user"),
      { isActive: true, email: "flutter@test.com", firstName: "Flutter" }
    );
    await setDoc(
      doc(db, "clients/client-1/events/event-1/users", "deactivated-user"),
      {
        isActive: false,
        email: "deactivated@test.com",
        firstName: "Deactivated",
      }
    );

    // --- User subcollections ---
    await setDoc(
      doc(
        db,
        "clients/client-1/events/event-1/users/flutter-user/favorites",
        "fav-1"
      ),
      { itemId: "brand-1", type: "brand" }
    );
    await setDoc(
      doc(
        db,
        "clients/client-1/events/event-1/users/deactivated-user/favorites",
        "fav-1"
      ),
      { itemId: "brand-1", type: "brand" }
    );
  });
});

// ================================================================
// TESTS
// ================================================================

describe("Firestore security rules", () => {
  // ============================================================
  // clients/{clientId}
  // ============================================================
  describe("clients/{clientId}", () => {
    const path = "clients/client-1";

    it("SuperAdmin can read", async () => {
      await assertSucceeds(getDoc(doc(superadminCtx().firestore(), path)));
    });

    it("SuperAdmin can write", async () => {
      await assertSucceeds(
        setDoc(doc(superadminCtx().firestore(), path), { name: "Updated" })
      );
    });

    it("ClientAdmin (assigned) can read", async () => {
      await assertSucceeds(getDoc(doc(clientAdminCtx().firestore(), path)));
    });

    it("ClientAdmin (assigned) cannot write", async () => {
      await assertFails(
        setDoc(doc(clientAdminCtx().firestore(), path), { name: "Hack" })
      );
    });

    it("ClientAdmin (unassigned) cannot read", async () => {
      await assertFails(
        getDoc(doc(unassignedClientAdminCtx().firestore(), path))
      );
    });

    it("EventAdmin (assigned) can read", async () => {
      await assertSucceeds(getDoc(doc(eventAdminCtx().firestore(), path)));
    });

    it("EventAdmin (unassigned) cannot read", async () => {
      await assertFails(
        getDoc(doc(unassignedEventAdminCtx().firestore(), path))
      );
    });

    it("Flutter user cannot read", async () => {
      await assertFails(getDoc(doc(flutterUserCtx().firestore(), path)));
    });

    it("Deactivated user cannot read", async () => {
      await assertFails(getDoc(doc(deactivatedUserCtx().firestore(), path)));
    });

    it("Unregistered user cannot read", async () => {
      await assertFails(getDoc(doc(unregisteredUserCtx().firestore(), path)));
    });

    it("Unauthenticated cannot read", async () => {
      await assertFails(getDoc(doc(unauthCtx().firestore(), path)));
    });
  });

  // ============================================================
  // clients/{clientId}/events/{eventId}
  // ============================================================
  describe("clients/{clientId}/events/{eventId}", () => {
    const path = "clients/client-1/events/event-1";

    it("SuperAdmin can read", async () => {
      await assertSucceeds(getDoc(doc(superadminCtx().firestore(), path)));
    });

    it("SuperAdmin can write", async () => {
      await assertSucceeds(
        setDoc(doc(superadminCtx().firestore(), path), { name: "Updated" })
      );
    });

    it("ClientAdmin (assigned) can read", async () => {
      await assertSucceeds(getDoc(doc(clientAdminCtx().firestore(), path)));
    });

    it("ClientAdmin (assigned) can write", async () => {
      await assertSucceeds(
        setDoc(doc(clientAdminCtx().firestore(), path), { name: "Updated" })
      );
    });

    it("ClientAdmin (unassigned) cannot read", async () => {
      await assertFails(
        getDoc(doc(unassignedClientAdminCtx().firestore(), path))
      );
    });

    it("EventAdmin (assigned) can read", async () => {
      await assertSucceeds(getDoc(doc(eventAdminCtx().firestore(), path)));
    });

    it("EventAdmin (assigned) cannot write events", async () => {
      await assertFails(
        setDoc(doc(eventAdminCtx().firestore(), path), { name: "Hack" })
      );
    });

    it("EventAdmin (unassigned) cannot read", async () => {
      await assertFails(
        getDoc(doc(unassignedEventAdminCtx().firestore(), path))
      );
    });

    it("Active Flutter user can read", async () => {
      await assertSucceeds(getDoc(doc(flutterUserCtx().firestore(), path)));
    });

    it("Deactivated Flutter user cannot read", async () => {
      await assertFails(getDoc(doc(deactivatedUserCtx().firestore(), path)));
    });

    it("Unregistered user cannot read", async () => {
      await assertFails(getDoc(doc(unregisteredUserCtx().firestore(), path)));
    });

    it("Unauthenticated cannot read", async () => {
      await assertFails(getDoc(doc(unauthCtx().firestore(), path)));
    });
  });

  // ============================================================
  // Event content subcollections (brands, sessions, happenings, posts, stands, participants)
  // ============================================================
  describe("event content subcollections (brands, sessions, etc.)", () => {
    const brandPath = "clients/client-1/events/event-1/brands/brand-1";
    const sessionPath = "clients/client-1/events/event-1/sessions/session-1";

    it("SuperAdmin can read", async () => {
      await assertSucceeds(
        getDoc(doc(superadminCtx().firestore(), brandPath))
      );
    });

    it("SuperAdmin can write", async () => {
      await assertSucceeds(
        setDoc(doc(superadminCtx().firestore(), brandPath), {
          name: "Updated",
        })
      );
    });

    it("ClientAdmin (assigned) can read", async () => {
      await assertSucceeds(
        getDoc(doc(clientAdminCtx().firestore(), brandPath))
      );
    });

    it("ClientAdmin (assigned) can write", async () => {
      await assertSucceeds(
        setDoc(doc(clientAdminCtx().firestore(), brandPath), {
          name: "Updated",
        })
      );
    });

    it("ClientAdmin (unassigned) cannot read", async () => {
      await assertFails(
        getDoc(doc(unassignedClientAdminCtx().firestore(), brandPath))
      );
    });

    it("EventAdmin (assigned) can read", async () => {
      await assertSucceeds(
        getDoc(doc(eventAdminCtx().firestore(), brandPath))
      );
    });

    it("EventAdmin (assigned) can write", async () => {
      await assertSucceeds(
        setDoc(doc(eventAdminCtx().firestore(), brandPath), {
          name: "Updated",
        })
      );
    });

    it("EventAdmin (unassigned) cannot read", async () => {
      await assertFails(
        getDoc(doc(unassignedEventAdminCtx().firestore(), brandPath))
      );
    });

    it("Active Flutter user can read brands", async () => {
      await assertSucceeds(
        getDoc(doc(flutterUserCtx().firestore(), brandPath))
      );
    });

    it("Active Flutter user can read sessions", async () => {
      await assertSucceeds(
        getDoc(doc(flutterUserCtx().firestore(), sessionPath))
      );
    });

    it("Active Flutter user cannot write", async () => {
      await assertFails(
        setDoc(doc(flutterUserCtx().firestore(), brandPath), { name: "Hack" })
      );
    });

    it("Deactivated Flutter user cannot read", async () => {
      await assertFails(
        getDoc(doc(deactivatedUserCtx().firestore(), brandPath))
      );
    });

    it("Unregistered user cannot read", async () => {
      await assertFails(
        getDoc(doc(unregisteredUserCtx().firestore(), brandPath))
      );
    });

    it("Unauthenticated cannot read", async () => {
      await assertFails(getDoc(doc(unauthCtx().firestore(), brandPath)));
    });
  });

  // ============================================================
  // Whitelist — readable by ALL authenticated users (COLLECTION_GROUP query support)
  // ============================================================
  describe("whitelist/{whitelistId}", () => {
    const path = "clients/client-1/events/event-1/whitelist/wl-1";

    it("SuperAdmin can read", async () => {
      await assertSucceeds(getDoc(doc(superadminCtx().firestore(), path)));
    });

    it("SuperAdmin can write", async () => {
      await assertSucceeds(
        setDoc(doc(superadminCtx().firestore(), path), {
          email: "new@test.com",
        })
      );
    });

    it("ClientAdmin (assigned) can read", async () => {
      await assertSucceeds(getDoc(doc(clientAdminCtx().firestore(), path)));
    });

    it("ClientAdmin (assigned) can write", async () => {
      await assertSucceeds(
        setDoc(doc(clientAdminCtx().firestore(), path), {
          email: "new@test.com",
        })
      );
    });

    it("ClientAdmin (unassigned) cannot write", async () => {
      await assertFails(
        setDoc(doc(unassignedClientAdminCtx().firestore(), path), {
          email: "hack@test.com",
        })
      );
    });

    it("EventAdmin (assigned) can read", async () => {
      await assertSucceeds(getDoc(doc(eventAdminCtx().firestore(), path)));
    });

    it("EventAdmin (assigned) can write", async () => {
      await assertSucceeds(
        setDoc(doc(eventAdminCtx().firestore(), path), {
          email: "new@test.com",
        })
      );
    });

    it("EventAdmin (unassigned) cannot write", async () => {
      await assertFails(
        setDoc(doc(unassignedEventAdminCtx().firestore(), path), {
          email: "hack@test.com",
        })
      );
    });

    it("Active Flutter user can read (needed for auth flow)", async () => {
      await assertSucceeds(getDoc(doc(flutterUserCtx().firestore(), path)));
    });

    it("Deactivated Flutter user can read (for 'access revoked' state)", async () => {
      await assertSucceeds(getDoc(doc(deactivatedUserCtx().firestore(), path)));
    });

    it("Unregistered auth user can read (for whitelist check)", async () => {
      await assertSucceeds(
        getDoc(doc(unregisteredUserCtx().firestore(), path))
      );
    });

    it("Flutter user cannot write", async () => {
      await assertFails(
        setDoc(doc(flutterUserCtx().firestore(), path), {
          email: "hack@test.com",
        })
      );
    });

    it("Unauthenticated cannot read", async () => {
      await assertFails(getDoc(doc(unauthCtx().firestore(), path)));
    });
  });

  // ============================================================
  // Event users — own document access (Flutter user self-access)
  // ============================================================
  describe("users/{userId} — own document", () => {
    const activePath =
      "clients/client-1/events/event-1/users/flutter-user";
    const deactivatedPath =
      "clients/client-1/events/event-1/users/deactivated-user";

    it("Active Flutter user can read own doc", async () => {
      await assertSucceeds(
        getDoc(doc(flutterUserCtx().firestore(), activePath))
      );
    });

    it("Active Flutter user can update own doc", async () => {
      await assertSucceeds(
        updateDoc(doc(flutterUserCtx().firestore(), activePath), {
          firstName: "Updated",
        })
      );
    });

    it("Deactivated Flutter user can read own doc", async () => {
      await assertSucceeds(
        getDoc(doc(deactivatedUserCtx().firestore(), deactivatedPath))
      );
    });

    it("Deactivated Flutter user cannot update own doc", async () => {
      await assertFails(
        updateDoc(doc(deactivatedUserCtx().firestore(), deactivatedPath), {
          firstName: "Hack",
        })
      );
    });

    it("Flutter user can create own doc in a new event", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "clients/client-1/events", "event-2"),
          { name: "Event 2" }
        );
      });

      await assertSucceeds(
        setDoc(
          doc(
            flutterUserCtx().firestore(),
            "clients/client-1/events/event-2/users/flutter-user"
          ),
          { isActive: true, email: "flutter@test.com", firstName: "Flutter" }
        )
      );
    });

    it("Unregistered user cannot read other user's doc", async () => {
      await assertFails(
        getDoc(doc(unregisteredUserCtx().firestore(), activePath))
      );
    });

    it("Flutter user cannot read other user's doc", async () => {
      await assertFails(
        getDoc(doc(flutterUserCtx().firestore(), deactivatedPath))
      );
    });

    it("Unauthenticated cannot read user docs", async () => {
      await assertFails(getDoc(doc(unauthCtx().firestore(), activePath)));
    });
  });

  // ============================================================
  // Event users — admin access to other users' docs
  // ============================================================
  describe("users/{userId} — admin access", () => {
    const userPath = "clients/client-1/events/event-1/users/flutter-user";

    it("SuperAdmin can read other user's doc", async () => {
      await assertSucceeds(
        getDoc(doc(superadminCtx().firestore(), userPath))
      );
    });

    it("SuperAdmin can write other user's doc", async () => {
      await assertSucceeds(
        updateDoc(doc(superadminCtx().firestore(), userPath), {
          isActive: false,
        })
      );
    });

    it("SuperAdmin can delete user doc", async () => {
      await assertSucceeds(
        deleteDoc(doc(superadminCtx().firestore(), userPath))
      );
    });

    it("ClientAdmin (assigned) can read other user's doc", async () => {
      await assertSucceeds(
        getDoc(doc(clientAdminCtx().firestore(), userPath))
      );
    });

    it("ClientAdmin (assigned) can write other user's doc", async () => {
      await assertSucceeds(
        updateDoc(doc(clientAdminCtx().firestore(), userPath), {
          isActive: false,
        })
      );
    });

    it("ClientAdmin (unassigned) cannot read other user's doc", async () => {
      await assertFails(
        getDoc(doc(unassignedClientAdminCtx().firestore(), userPath))
      );
    });

    it("EventAdmin (assigned) can read other user's doc", async () => {
      await assertSucceeds(
        getDoc(doc(eventAdminCtx().firestore(), userPath))
      );
    });

    it("EventAdmin (assigned) can write other user's doc", async () => {
      await assertSucceeds(
        updateDoc(doc(eventAdminCtx().firestore(), userPath), {
          isActive: false,
        })
      );
    });

    it("EventAdmin (unassigned) cannot read other user's doc", async () => {
      await assertFails(
        getDoc(doc(unassignedEventAdminCtx().firestore(), userPath))
      );
    });
  });

  // ============================================================
  // User subcollections (favorites, chatMeta, chats, feedback)
  // ============================================================
  describe("users/{userId}/favorites — subcollection access", () => {
    const activeFavPath =
      "clients/client-1/events/event-1/users/flutter-user/favorites/fav-1";
    const newFavPath =
      "clients/client-1/events/event-1/users/flutter-user/favorites/fav-2";
    const deactivatedFavPath =
      "clients/client-1/events/event-1/users/deactivated-user/favorites/fav-1";
    const deactivatedNewFavPath =
      "clients/client-1/events/event-1/users/deactivated-user/favorites/fav-2";

    it("Active Flutter user can read own favorites", async () => {
      await assertSucceeds(
        getDoc(doc(flutterUserCtx().firestore(), activeFavPath))
      );
    });

    it("Active Flutter user can create own favorites", async () => {
      await assertSucceeds(
        setDoc(doc(flutterUserCtx().firestore(), newFavPath), {
          itemId: "brand-2",
          type: "brand",
        })
      );
    });

    it("Active Flutter user can delete own favorites", async () => {
      await assertSucceeds(
        deleteDoc(doc(flutterUserCtx().firestore(), activeFavPath))
      );
    });

    it("Deactivated Flutter user can read own favorites", async () => {
      await assertSucceeds(
        getDoc(doc(deactivatedUserCtx().firestore(), deactivatedFavPath))
      );
    });

    it("Deactivated Flutter user cannot create favorites", async () => {
      await assertFails(
        setDoc(doc(deactivatedUserCtx().firestore(), deactivatedNewFavPath), {
          itemId: "brand-2",
          type: "brand",
        })
      );
    });

    it("Deactivated Flutter user cannot delete favorites", async () => {
      await assertFails(
        deleteDoc(
          doc(deactivatedUserCtx().firestore(), deactivatedFavPath)
        )
      );
    });

    it("SuperAdmin can read user's favorites", async () => {
      await assertSucceeds(
        getDoc(doc(superadminCtx().firestore(), activeFavPath))
      );
    });

    it("ClientAdmin (assigned) can read user's favorites", async () => {
      await assertSucceeds(
        getDoc(doc(clientAdminCtx().firestore(), activeFavPath))
      );
    });

    it("EventAdmin (assigned) can read user's favorites", async () => {
      await assertSucceeds(
        getDoc(doc(eventAdminCtx().firestore(), activeFavPath))
      );
    });

    it("EventAdmin (unassigned) cannot read user's favorites", async () => {
      await assertFails(
        getDoc(doc(unassignedEventAdminCtx().firestore(), activeFavPath))
      );
    });

    it("Flutter user cannot read other user's favorites", async () => {
      await assertFails(
        getDoc(doc(flutterUserCtx().firestore(), deactivatedFavPath))
      );
    });

    it("Unauthenticated cannot read favorites", async () => {
      await assertFails(
        getDoc(doc(unauthCtx().firestore(), activeFavPath))
      );
    });
  });

  // ============================================================
  // userPermissions collection
  // ============================================================
  describe("userPermissions/{userId}", () => {
    it("SuperAdmin can read any userPermissions doc", async () => {
      await assertSucceeds(
        getDoc(
          doc(superadminCtx().firestore(), "userPermissions/clientadmin-user")
        )
      );
    });

    it("SuperAdmin can list userPermissions", async () => {
      await assertSucceeds(
        getDocs(collection(superadminCtx().firestore(), "userPermissions"))
      );
    });

    it("SuperAdmin can create userPermissions", async () => {
      await assertSucceeds(
        setDoc(
          doc(superadminCtx().firestore(), "userPermissions/new-admin"),
          {
            userId: "new-admin",
            email: "new@test.com",
            role: "eventAdmin",
            clientIds: ["client-1"],
            eventIds: ["event-1"],
          }
        )
      );
    });

    it("SuperAdmin can update userPermissions", async () => {
      await assertSucceeds(
        updateDoc(
          doc(
            superadminCtx().firestore(),
            "userPermissions/clientadmin-user"
          ),
          { clientIds: ["client-1", "client-2"] }
        )
      );
    });

    it("SuperAdmin can delete userPermissions", async () => {
      await assertSucceeds(
        deleteDoc(
          doc(
            superadminCtx().firestore(),
            "userPermissions/eventadmin-user"
          )
        )
      );
    });

    it("ClientAdmin can read own userPermissions", async () => {
      await assertSucceeds(
        getDoc(
          doc(
            clientAdminCtx().firestore(),
            "userPermissions/clientadmin-user"
          )
        )
      );
    });

    it("ClientAdmin cannot read other's userPermissions", async () => {
      await assertFails(
        getDoc(
          doc(
            clientAdminCtx().firestore(),
            "userPermissions/eventadmin-user"
          )
        )
      );
    });

    it("ClientAdmin cannot list userPermissions", async () => {
      await assertFails(
        getDocs(collection(clientAdminCtx().firestore(), "userPermissions"))
      );
    });

    it("ClientAdmin cannot write userPermissions", async () => {
      await assertFails(
        setDoc(
          doc(clientAdminCtx().firestore(), "userPermissions/new-user"),
          { role: "eventAdmin" }
        )
      );
    });

    it("EventAdmin can read own userPermissions", async () => {
      await assertSucceeds(
        getDoc(
          doc(
            eventAdminCtx().firestore(),
            "userPermissions/eventadmin-user"
          )
        )
      );
    });

    it("EventAdmin cannot write userPermissions", async () => {
      await assertFails(
        setDoc(
          doc(eventAdminCtx().firestore(), "userPermissions/new-user"),
          { role: "eventAdmin" }
        )
      );
    });

    it("Flutter user cannot read userPermissions", async () => {
      await assertFails(
        getDoc(
          doc(flutterUserCtx().firestore(), "userPermissions/flutter-user")
        )
      );
    });

    it("Unauthenticated cannot read userPermissions", async () => {
      await assertFails(
        getDoc(doc(unauthCtx().firestore(), "userPermissions/anyone"))
      );
    });
  });

  // ============================================================
  // Cross-cutting: SuperAdmin with legacy 'admin' claim
  // ============================================================
  describe("legacy admin claim support", () => {
    function legacyAdminCtx() {
      return testEnv.authenticatedContext("legacy-admin", { admin: true });
    }

    it("legacy admin claim grants client read", async () => {
      await assertSucceeds(
        getDoc(doc(legacyAdminCtx().firestore(), "clients/client-1"))
      );
    });

    it("legacy admin claim grants client write", async () => {
      await assertSucceeds(
        setDoc(doc(legacyAdminCtx().firestore(), "clients/client-1"), {
          name: "Updated",
        })
      );
    });

    it("legacy admin claim grants event content write", async () => {
      await assertSucceeds(
        setDoc(
          doc(
            legacyAdminCtx().firestore(),
            "clients/client-1/events/event-1/brands/brand-1"
          ),
          { name: "Updated" }
        )
      );
    });
  });
});
