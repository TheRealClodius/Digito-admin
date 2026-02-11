import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase client modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// === Firebase admin mock ===

const mockVerifyIdToken = vi.fn();
const mockSetCustomUserClaims = vi.fn();
let mockAdminAuthShouldThrow = false;

const mockFirestoreState = {
  docs: {} as Record<string, Record<string, unknown>>,
  queryResults: [] as Array<{ id: string; data: Record<string, unknown> }>,
  sets: [] as Array<{ path: string; data: unknown }>,
  deletes: [] as string[],
  whereArgs: [] as Array<{ field: string; op: string; value: unknown }>,
  shouldThrow: false,
};

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => {
    if (mockAdminAuthShouldThrow) {
      throw new Error("Firebase Admin SDK not initialized");
    }
    return {
      verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
      setCustomUserClaims: (...args: unknown[]) =>
        mockSetCustomUserClaims(...args),
    };
  },
  getAdminDb: () => ({
    collection: (collectionName: string) => ({
      doc: (docId: string) => {
        const path = `${collectionName}/${docId}`;
        return {
          get: () => {
            if (mockFirestoreState.shouldThrow) {
              return Promise.reject(new Error("Firestore unavailable"));
            }
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
          delete: () => {
            mockFirestoreState.deletes.push(path);
            return Promise.resolve();
          },
        };
      },
      where: (field: string, op: string, value: unknown) => {
        mockFirestoreState.whereArgs.push({ field, op, value });
        return {
          limit: () => ({
            get: () =>
              Promise.resolve({
                empty: mockFirestoreState.queryResults.length === 0,
                docs: mockFirestoreState.queryResults.map((doc) => ({
                  id: doc.id,
                  data: () => doc.data,
                  ref: {
                    delete: () => {
                      mockFirestoreState.deletes.push(
                        `${collectionName}/${doc.id}`
                      );
                      return Promise.resolve();
                    },
                  },
                })),
              }),
          }),
        };
      },
    }),
  }),
}));

import { GET } from "./route";

function createRequest(token: string | null = "valid-token") {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/check-permissions", {
    method: "GET",
    headers,
  });
}

describe("GET /api/check-permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminAuthShouldThrow = false;
    mockFirestoreState.docs = {};
    mockFirestoreState.queryResults = [];
    mockFirestoreState.sets = [];
    mockFirestoreState.deletes = [];
    mockFirestoreState.whereArgs = [];
    mockFirestoreState.shouldThrow = false;
    mockSetCustomUserClaims.mockResolvedValue(undefined);
  });

  it("returns 401 without authorization header", async () => {
    const res = await GET(createRequest(null));
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it("returns 503 when Firebase Admin SDK fails to initialize", async () => {
    mockAdminAuthShouldThrow = true;
    const res = await GET(createRequest());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Firebase Admin SDK not configured");
  });

  it("returns superadmin role from custom claims", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      email: "super@test.com",
      superadmin: true,
    });
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("superadmin");
  });

  it("returns superadmin role from legacy admin claim", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      email: "super@test.com",
      admin: true,
    });
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("superadmin");
  });

  it("returns clientAdmin role from custom claims with permissions", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "client-uid",
      email: "client@test.com",
      role: "clientAdmin",
    });
    mockFirestoreState.docs["userPermissions/client-uid"] = {
      userId: "client-uid",
      email: "client@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
      eventIds: null,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("clientAdmin");
    expect(body.permissions.clientIds).toEqual(["c1"]);
  });

  it("falls back to Firestore by UID when no claims, auto-heals claims", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-uid",
      email: "user@test.com",
    });
    mockFirestoreState.docs["userPermissions/user-uid"] = {
      userId: "user-uid",
      email: "user@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
      eventIds: null,
    };
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("clientAdmin");

    // Should auto-heal claims
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-uid", {
      role: "clientAdmin",
    });
  });

  it("falls back to email search when UID doc missing, fixes UID and auto-heals", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "new-uid",
      email: "user@test.com",
    });
    // No doc at userPermissions/new-uid
    // But email query finds a doc under a different UID
    mockFirestoreState.queryResults = [
      {
        id: "old-uid",
        data: {
          userId: "old-uid",
          email: "user@test.com",
          role: "clientAdmin",
          clientIds: ["c1"],
          eventIds: null,
        },
      },
    ];

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("clientAdmin");

    // Should create new doc with correct UID
    const newSet = mockFirestoreState.sets.find(
      (s) => s.path === "userPermissions/new-uid"
    );
    expect(newSet).toBeDefined();
    const newData = newSet!.data as Record<string, unknown>;
    expect(newData.userId).toBe("new-uid");

    // Should delete old doc
    expect(mockFirestoreState.deletes).toContain("userPermissions/old-uid");

    // Should auto-heal claims
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("new-uid", {
      role: "clientAdmin",
    });
  });

  it("returns null role when no permissions found anywhere", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "unknown-uid",
      email: "unknown@test.com",
    });
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBeNull();
  });

  it("normalizes email to lowercase for Firestore email query", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "new-uid",
      email: "Andrei.Clodius@Goodgest.com",  // Mixed-case from Google Auth
    });
    // No doc at userPermissions/new-uid
    mockFirestoreState.queryResults = [
      {
        id: "old-uid",
        data: {
          userId: "old-uid",
          email: "andrei.clodius@goodgest.com",
          role: "superadmin",
          clientIds: null,
          eventIds: null,
        },
      },
    ];

    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.role).toBe("superadmin");

    // The email query must use lowercase email
    const emailWhere = mockFirestoreState.whereArgs.find(
      (w) => w.field === "email"
    );
    expect(emailWhere).toBeDefined();
    expect(emailWhere!.value).toBe("andrei.clodius@goodgest.com");
  });

  it("returns 500 when Firestore is unavailable instead of crashing", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-uid",
      email: "user@test.com",
    });
    mockFirestoreState.shouldThrow = true;

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Firestore operation failed");
  });

  it("does not auto-heal when claims already match", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-uid",
      email: "user@test.com",
      role: "clientAdmin",
    });
    mockFirestoreState.docs["userPermissions/user-uid"] = {
      userId: "user-uid",
      email: "user@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    };
    await GET(createRequest());
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
