import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase modules to prevent initialization
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

const mockFirestoreState = {
  docs: {} as Record<string, Record<string, unknown>>,
  deletes: [] as string[],
};

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    setCustomUserClaims: (...args: unknown[]) =>
      mockSetCustomUserClaims(...args),
  }),
  getAdminDb: () => ({
    collection: (collectionName: string) => ({
      doc: (docId: string) => {
        const path = `${collectionName}/${docId}`;
        return {
          get: () => {
            const data = mockFirestoreState.docs[path];
            return Promise.resolve({
              exists: data !== undefined,
              data: () => data,
            });
          },
          delete: () => {
            mockFirestoreState.deletes.push(path);
            return Promise.resolve();
          },
        };
      },
    }),
  }),
}));

import { DELETE } from "./route";

// === Helpers ===

function createRequest(
  body: Record<string, unknown>,
  token: string | null = "valid-token"
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/remove-user-role", {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
}

function setupSuperadminCaller() {
  mockVerifyIdToken.mockResolvedValue({
    uid: "superadmin-uid",
    superadmin: true,
  });
}

function setupClientAdminCaller() {
  mockVerifyIdToken.mockResolvedValue({
    uid: "clientadmin-uid",
    role: "clientAdmin",
  });
  mockFirestoreState.docs["userPermissions/clientadmin-uid"] = {
    role: "clientAdmin",
    clientIds: ["client-1"],
  };
}

function setupEventAdminCaller() {
  mockVerifyIdToken.mockResolvedValue({
    uid: "eventadmin-uid",
    role: "eventAdmin",
  });
}

// === Tests ===

describe("DELETE /api/remove-user-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestoreState.docs = {};
    mockFirestoreState.deletes = [];
    mockSetCustomUserClaims.mockResolvedValue(undefined);
  });

  it("returns 401 without authorization header", async () => {
    const req = createRequest({ userId: "target-uid" }, null);
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing userId", async () => {
    setupSuperadminCaller();
    const req = createRequest({});
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when target user permissions not found", async () => {
    setupSuperadminCaller();
    const req = createRequest({ userId: "nonexistent-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 when trying to remove superadmin", async () => {
    setupSuperadminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "superadmin",
      clientIds: null,
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when eventAdmin tries to remove role", async () => {
    setupEventAdminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1"],
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when clientAdmin tries to remove clientAdmin", async () => {
    setupClientAdminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "clientAdmin",
      clientIds: ["client-1"],
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when clientAdmin tries to remove eventAdmin from unassigned client", async () => {
    setupClientAdminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "eventAdmin",
      clientIds: ["other-client"],
      eventIds: ["event-1"],
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("superadmin can remove clientAdmin", async () => {
    setupSuperadminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "clientAdmin",
      clientIds: ["client-1"],
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify claims cleared
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: null,
    });

    // Verify permissions doc deleted
    expect(mockFirestoreState.deletes).toContain(
      "userPermissions/target-uid"
    );
  });

  it("superadmin can remove eventAdmin", async () => {
    setupSuperadminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1"],
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: null,
    });
    expect(mockFirestoreState.deletes).toContain(
      "userPermissions/target-uid"
    );
  });

  it("clientAdmin can remove eventAdmin for their clients", async () => {
    setupClientAdminCaller();
    mockFirestoreState.docs["userPermissions/target-uid"] = {
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1"],
    };
    const req = createRequest({ userId: "target-uid" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: null,
    });
    expect(mockFirestoreState.deletes).toContain(
      "userPermissions/target-uid"
    );
  });
});
