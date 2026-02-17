import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// Mock Firebase client SDK (imported transitively by some modules)
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// === api-auth mock (replaces firebase-admin verifyIdToken) ===

const mockRequireAuth = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

// === Firebase admin mock (still used by sub-routes for Firestore data access) ===

const mockFirestoreState = {
  docs: {} as Record<string, Record<string, unknown> | undefined>,
  queries: {} as Record<
    string,
    Array<{ id: string; data: Record<string, unknown> }>
  >,
  updates: [] as Array<{ path: string; data: unknown }>,
  sets: [] as Array<{ path: string; data: unknown }>,
  deletes: [] as string[],
  recursiveDeletes: [] as string[],
};

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (collectionPath: string) => ({
      doc: (docId: string) => {
        const path = `${collectionPath}/${docId}`;
        return {
          path,
          get: () => {
            const data = mockFirestoreState.docs[path];
            return Promise.resolve({
              exists: data !== undefined,
              data: () => data,
            });
          },
          set: (data: unknown) => {
            mockFirestoreState.sets.push({ path, data });
            return Promise.resolve();
          },
          update: (data: unknown) => {
            mockFirestoreState.updates.push({ path, data });
            return Promise.resolve();
          },
          delete: () => {
            mockFirestoreState.deletes.push(path);
            return Promise.resolve();
          },
        };
      },
      where: (field: string, _op: string, value: unknown) => ({
        get: () => {
          const key = `${collectionPath}:${field}=${value}`;
          const results = mockFirestoreState.queries[key] || [];
          return Promise.resolve({
            empty: results.length === 0,
            docs: results.map((r) => ({
              id: r.id,
              ref: {
                path: `${collectionPath}/${r.id}`,
                delete: () => {
                  mockFirestoreState.deletes.push(
                    `${collectionPath}/${r.id}`
                  );
                  return Promise.resolve();
                },
              },
              data: () => r.data,
            })),
          });
        },
      }),
    }),
    recursiveDelete: (ref: { path: string }) => {
      mockFirestoreState.recursiveDeletes.push(ref.path);
      return Promise.resolve();
    },
  }),
}));

import { POST as deactivate } from "./deactivate/route";
import { POST as reactivate } from "./reactivate/route";
import { POST as deleteUser } from "./delete/route";

// === Helpers ===

function createRequest(
  url: string,
  body: Record<string, unknown>,
  token: string | null = "valid-token"
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    cognitoSub: "default-sub",
    email: "admin@test.com",
    role: "superadmin",
    clientIds: null,
    eventCodes: null,
    firstName: "Test",
    lastName: "Admin",
    isActive: true,
    language: "en",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    updatedBy: "system",
    ...overrides,
  };
}

function setupSuperadminCaller() {
  const adminUser = makeAdminUser({
    cognitoSub: "superadmin-sub",
    email: "superadmin@test.com",
    role: "superadmin",
    clientIds: null,
    eventCodes: null,
  });
  mockRequireAuth.mockResolvedValue({
    sub: "superadmin-sub",
    email: "superadmin@test.com",
    role: "superadmin",
    isSuperAdmin: true,
    adminUser,
  });
}

function setupClientAdminCaller() {
  const adminUser = makeAdminUser({
    cognitoSub: "clientadmin-sub",
    email: "clientadmin@test.com",
    role: "clientAdmin",
    clientIds: ["client-1"],
    eventCodes: null,
  });
  mockRequireAuth.mockResolvedValue({
    sub: "clientadmin-sub",
    email: "clientadmin@test.com",
    role: "clientAdmin",
    isSuperAdmin: false,
    adminUser,
  });
}

function setupEventAdminCaller() {
  const adminUser = makeAdminUser({
    cognitoSub: "eventadmin-sub",
    email: "eventadmin@test.com",
    role: "eventAdmin",
    clientIds: ["client-1"],
    eventCodes: ["event-1"],
  });
  mockRequireAuth.mockResolvedValue({
    sub: "eventadmin-sub",
    email: "eventadmin@test.com",
    role: "eventAdmin",
    isSuperAdmin: false,
    adminUser,
  });
}

function setupUnauthenticated() {
  mockRequireAuth.mockResolvedValue(
    NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    )
  );
}

function seedUserDoc() {
  mockFirestoreState.docs[
    "clients/client-1/events/event-1/users/flutter-user"
  ] = {
    isActive: true,
    email: "flutter@test.com",
    firstName: "Flutter",
  };
}

function seedWhitelistQuery() {
  mockFirestoreState.queries[
    "clients/client-1/events/event-1/whitelist:email=flutter@test.com"
  ] = [{ id: "wl-1", data: { email: "flutter@test.com", accessTier: "standard" } }];
}

function seedDeactivatedUserDoc() {
  mockFirestoreState.docs[
    "clients/client-1/events/event-1/users/flutter-user"
  ] = {
    isActive: false,
    email: "flutter@test.com",
    firstName: "Flutter",
  };
}

function resetFirestoreState() {
  mockFirestoreState.docs = {};
  mockFirestoreState.queries = {};
  mockFirestoreState.updates = [];
  mockFirestoreState.sets = [];
  mockFirestoreState.deletes = [];
  mockFirestoreState.recursiveDeletes = [];
}

// === Tests ===

describe("POST /api/event-users/deactivate", () => {
  const url = "http://localhost/api/event-users/deactivate";
  const body = { clientId: "client-1", eventId: "event-1", userId: "flutter-user" };

  beforeEach(() => {
    vi.clearAllMocks();
    resetFirestoreState();
  });

  it("returns 401 without authorization", async () => {
    setupUnauthenticated();
    const req = createRequest(url, body, null);
    const res = await deactivate(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing fields", async () => {
    setupSuperadminCaller();
    const req = createRequest(url, { clientId: "client-1" });
    const res = await deactivate(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user doc not found", async () => {
    setupSuperadminCaller();
    const req = createRequest(url, body);
    const res = await deactivate(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when eventAdmin tries for unassigned event", async () => {
    setupEventAdminCaller();
    seedUserDoc();
    const req = createRequest(url, {
      clientId: "client-1",
      eventId: "event-2",
      userId: "flutter-user",
    });
    const res = await deactivate(req);
    expect(res.status).toBe(403);
  });

  it("superadmin can deactivate: sets isActive false + removes whitelist", async () => {
    setupSuperadminCaller();
    seedUserDoc();
    seedWhitelistQuery();

    const req = createRequest(url, body);
    const res = await deactivate(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify user doc updated
    const userUpdate = mockFirestoreState.updates.find((u) =>
      u.path.includes("users/flutter-user")
    );
    expect(userUpdate).toBeDefined();
    expect((userUpdate!.data as Record<string, unknown>).isActive).toBe(false);

    // Verify whitelist entry deleted
    expect(mockFirestoreState.deletes).toContain(
      "clients/client-1/events/event-1/whitelist/wl-1"
    );
  });

  it("clientAdmin can deactivate for their client", async () => {
    setupClientAdminCaller();
    seedUserDoc();
    seedWhitelistQuery();

    const req = createRequest(url, body);
    const res = await deactivate(req);
    expect(res.status).toBe(200);
  });

  it("eventAdmin can deactivate for their assigned event", async () => {
    setupEventAdminCaller();
    seedUserDoc();
    seedWhitelistQuery();

    const req = createRequest(url, body);
    const res = await deactivate(req);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/event-users/reactivate", () => {
  const url = "http://localhost/api/event-users/reactivate";
  const body = {
    clientId: "client-1",
    eventId: "event-1",
    userId: "flutter-user",
    whitelistData: { email: "flutter@test.com", accessTier: "standard" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetFirestoreState();
  });

  it("returns 401 without authorization", async () => {
    setupUnauthenticated();
    const req = createRequest(url, body, null);
    const res = await reactivate(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing fields", async () => {
    setupSuperadminCaller();
    const req = createRequest(url, { clientId: "client-1", eventId: "event-1" });
    const res = await reactivate(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user doc not found", async () => {
    setupSuperadminCaller();
    const req = createRequest(url, body);
    const res = await reactivate(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when eventAdmin tries for unassigned event", async () => {
    setupEventAdminCaller();
    seedDeactivatedUserDoc();
    const req = createRequest(url, {
      ...body,
      eventId: "event-2",
    });
    const res = await reactivate(req);
    expect(res.status).toBe(403);
  });

  it("superadmin can reactivate: sets isActive true + creates whitelist entry", async () => {
    setupSuperadminCaller();
    seedDeactivatedUserDoc();

    const req = createRequest(url, body);
    const res = await reactivate(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify user doc updated
    const userUpdate = mockFirestoreState.updates.find((u) =>
      u.path.includes("users/flutter-user")
    );
    expect(userUpdate).toBeDefined();
    expect((userUpdate!.data as Record<string, unknown>).isActive).toBe(true);

    // Verify whitelist entry created
    const whitelistSet = mockFirestoreState.sets.find((s) =>
      s.path.includes("whitelist/")
    );
    expect(whitelistSet).toBeDefined();
    const wlData = whitelistSet!.data as Record<string, unknown>;
    expect(wlData.email).toBe("flutter@test.com");
    expect(wlData.accessTier).toBe("standard");
  });
});

describe("POST /api/event-users/delete", () => {
  const url = "http://localhost/api/event-users/delete";
  const body = { clientId: "client-1", eventId: "event-1", userId: "flutter-user" };

  beforeEach(() => {
    vi.clearAllMocks();
    resetFirestoreState();
  });

  it("returns 401 without authorization", async () => {
    setupUnauthenticated();
    const req = createRequest(url, body, null);
    const res = await deleteUser(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing fields", async () => {
    setupSuperadminCaller();
    const req = createRequest(url, { clientId: "client-1" });
    const res = await deleteUser(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user doc not found", async () => {
    setupSuperadminCaller();
    const req = createRequest(url, body);
    const res = await deleteUser(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when eventAdmin tries for unassigned event", async () => {
    setupEventAdminCaller();
    seedUserDoc();
    const req = createRequest(url, {
      clientId: "client-1",
      eventId: "event-2",
      userId: "flutter-user",
    });
    const res = await deleteUser(req);
    expect(res.status).toBe(403);
  });

  it("superadmin can delete: removes whitelist + cascade deletes user", async () => {
    setupSuperadminCaller();
    seedUserDoc();
    seedWhitelistQuery();

    const req = createRequest(url, body);
    const res = await deleteUser(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify whitelist entry deleted
    expect(mockFirestoreState.deletes).toContain(
      "clients/client-1/events/event-1/whitelist/wl-1"
    );

    // Verify cascade delete of user doc
    expect(mockFirestoreState.recursiveDeletes).toContain(
      "clients/client-1/events/event-1/users/flutter-user"
    );
  });

  it("clientAdmin can delete for their client", async () => {
    setupClientAdminCaller();
    seedUserDoc();
    seedWhitelistQuery();

    const req = createRequest(url, body);
    const res = await deleteUser(req);
    expect(res.status).toBe(200);
  });
});
