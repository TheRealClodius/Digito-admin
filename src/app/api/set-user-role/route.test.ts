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
const mockGetUserByEmail = vi.fn();
const mockSetCustomUserClaims = vi.fn();

// Track Firestore operations
const mockFirestoreState = {
  docs: {} as Record<string, Record<string, unknown>>,
  sets: [] as Array<{ path: string; data: unknown }>,
};

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(...args),
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
          set: (data: unknown) => {
            mockFirestoreState.sets.push({ path, data });
            return Promise.resolve();
          },
        };
      },
    }),
  }),
}));

import { POST } from "./route";

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
  return new Request("http://localhost/api/set-user-role", {
    method: "POST",
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

describe("POST /api/set-user-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestoreState.docs = {};
    mockFirestoreState.sets = [];
    mockGetUserByEmail.mockResolvedValue({
      uid: "target-uid",
      email: "target@test.com",
    });
    mockSetCustomUserClaims.mockResolvedValue(undefined);
  });

  it("returns 401 without authorization header", async () => {
    const req = createRequest(
      { email: "target@test.com", role: "clientAdmin", clientIds: ["c1"] },
      null
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing email", async () => {
    setupSuperadminCaller();
    const req = createRequest({ role: "clientAdmin", clientIds: ["c1"] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 with missing role", async () => {
    setupSuperadminCaller();
    const req = createRequest({
      email: "target@test.com",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 with invalid role value", async () => {
    setupSuperadminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "superadmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 with missing clientIds", async () => {
    setupSuperadminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when eventAdmin tries to set any role", async () => {
    setupEventAdminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["c1"],
      eventIds: ["e1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when clientAdmin tries to set clientAdmin role", async () => {
    setupClientAdminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["client-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when clientAdmin creates eventAdmin for unassigned client", async () => {
    setupClientAdminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["other-client"],
      eventIds: ["e1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 when target user not found in Firebase Auth", async () => {
    setupSuperadminCaller();
    mockGetUserByEmail.mockRejectedValue({ code: "auth/user-not-found" });
    const req = createRequest({
      email: "nonexistent@test.com",
      role: "clientAdmin",
      clientIds: ["c1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("superadmin can create clientAdmin", async () => {
    setupSuperadminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "clientAdmin",
      clientIds: ["client-1", "client-2"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe("target-uid");

    // Verify custom claims set
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: "clientAdmin",
    });

    // Verify userPermissions doc created
    const permSet = mockFirestoreState.sets.find(
      (s) => s.path === "userPermissions/target-uid"
    );
    expect(permSet).toBeDefined();
    const permData = permSet!.data as Record<string, unknown>;
    expect(permData.userId).toBe("target-uid");
    expect(permData.email).toBe("target@test.com");
    expect(permData.role).toBe("clientAdmin");
    expect(permData.clientIds).toEqual(["client-1", "client-2"]);
  });

  it("superadmin can create eventAdmin", async () => {
    setupSuperadminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1", "event-2"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: "eventAdmin",
    });

    const permSet = mockFirestoreState.sets.find(
      (s) => s.path === "userPermissions/target-uid"
    );
    expect(permSet).toBeDefined();
    const permData = permSet!.data as Record<string, unknown>;
    expect(permData.role).toBe("eventAdmin");
    expect(permData.clientIds).toEqual(["client-1"]);
    expect(permData.eventIds).toEqual(["event-1", "event-2"]);
  });

  it("clientAdmin can create eventAdmin for their clients", async () => {
    setupClientAdminCaller();
    const req = createRequest({
      email: "target@test.com",
      role: "eventAdmin",
      clientIds: ["client-1"],
      eventIds: ["event-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: "eventAdmin",
    });

    const permSet = mockFirestoreState.sets.find(
      (s) => s.path === "userPermissions/target-uid"
    );
    expect(permSet).toBeDefined();
    const permData = permSet!.data as Record<string, unknown>;
    expect(permData.role).toBe("eventAdmin");
    expect(permData.createdBy).toBe("clientadmin-uid");
  });
});
