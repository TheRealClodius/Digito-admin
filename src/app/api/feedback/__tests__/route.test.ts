import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase client modules (required by transitive imports)
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// === Firebase admin mock ===

const mockVerifyIdToken = vi.fn();

// Store mock data per collection path
const mockCollectionDocs: Record<
  string,
  Array<{ id: string; data: Record<string, unknown> }>
> = {};

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  }),
  getAdminDb: () => ({
    collection: (collectionPath: string) => ({
      get: () => {
        const docs = mockCollectionDocs[collectionPath] || [];
        return Promise.resolve({
          empty: docs.length === 0,
          docs: docs.map((d) => ({
            id: d.id,
            data: () => d.data,
          })),
        });
      },
    }),
  }),
}));

import { GET } from "../route";

// === Helpers ===

function createRequest(
  params: Record<string, string>,
  token: string | null = "valid-token"
) {
  const url = new URL("http://localhost/api/feedback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request(url.toString(), { method: "GET", headers });
}

function seedUsers() {
  mockCollectionDocs["clients/client-1/events/event-1/users"] = [
    {
      id: "user-1",
      data: {
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@test.com",
        company: "Acme Corp",
      },
    },
    {
      id: "user-2",
      data: {
        firstName: "Bob",
        lastName: "Jones",
        email: "bob@test.com",
        company: "Beta Inc",
      },
    },
  ];
}

function seedFeedback() {
  mockCollectionDocs[
    "clients/client-1/events/event-1/users/user-1/feedback"
  ] = [
    {
      id: "fb-1",
      data: {
        feedbackText: "Great app!",
        timestamp: "2026-02-06T19:31:45.978310+00:00",
        chatSessionId: "chat-session-1",
      },
    },
    {
      id: "fb-2",
      data: {
        feedbackText: "Could improve the map",
        timestamp: "2026-02-06T19:41:46.862040+00:00",
        chatSessionId: "chat-session-2",
      },
    },
  ];
  mockCollectionDocs[
    "clients/client-1/events/event-1/users/user-2/feedback"
  ] = [
    {
      id: "fb-3",
      data: {
        feedbackText: "Love it!",
        timestamp: "2026-02-07T06:18:48.472750+00:00",
        chatSessionId: "chat-session-3",
      },
    },
  ];
}

// === Tests ===

describe("GET /api/feedback", () => {
  const params = { clientId: "client-1", eventId: "event-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all mock data
    for (const key of Object.keys(mockCollectionDocs)) {
      delete mockCollectionDocs[key];
    }
  });

  it("returns 401 without authorization header", async () => {
    const req = createRequest(params, null);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-superadmin (clientAdmin)", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "clientadmin-uid",
      role: "clientAdmin",
    });
    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-superadmin (eventAdmin)", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "eventadmin-uid",
      role: "eventAdmin",
    });
    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when clientId is missing", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      superadmin: true,
    });
    const req = createRequest({ eventId: "event-1" });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when eventId is missing", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      superadmin: true,
    });
    const req = createRequest({ clientId: "client-1" });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns enriched feedback sorted by timestamp descending", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      superadmin: true,
    });
    seedUsers();
    seedFeedback();

    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(3);

    // Should be sorted by timestamp descending (most recent first)
    expect(json[0].id).toBe("fb-3"); // 2026-02-07
    expect(json[0].userName).toBe("Bob Jones");
    expect(json[0].userEmail).toBe("bob@test.com");
    expect(json[0].userCompany).toBe("Beta Inc");
    expect(json[0].userId).toBe("user-2");
    expect(json[0].feedbackText).toBe("Love it!");

    expect(json[1].id).toBe("fb-2"); // 2026-02-06 19:41
    expect(json[1].userName).toBe("Alice Smith");

    expect(json[2].id).toBe("fb-1"); // 2026-02-06 19:31
    expect(json[2].userName).toBe("Alice Smith");
  });

  it("returns empty array when no users exist", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      superadmin: true,
    });

    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("returns empty array when users have no feedback", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      superadmin: true,
    });
    seedUsers();
    // No feedback seeded

    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("allows access with legacy admin claim", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-uid",
      admin: true,
    });
    seedUsers();
    seedFeedback();

    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(3);
  });

  it("handles users with missing profile fields gracefully", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "super-uid",
      superadmin: true,
    });
    mockCollectionDocs["clients/client-1/events/event-1/users"] = [
      {
        id: "user-sparse",
        data: { email: "sparse@test.com" },
      },
    ];
    mockCollectionDocs[
      "clients/client-1/events/event-1/users/user-sparse/feedback"
    ] = [
      {
        id: "fb-sparse",
        data: {
          feedbackText: "Some feedback",
          timestamp: "2026-02-06T10:00:00+00:00",
          chatSessionId: "chat-1",
        },
      },
    ];

    const req = createRequest(params);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].userName).toBe("");
    expect(json[0].userCompany).toBe("");
  });
});
