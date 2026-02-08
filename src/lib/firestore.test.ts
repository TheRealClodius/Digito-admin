import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDocument, addDocument, deleteEventCascade, deleteClientCascade, batchUpdateWhitelistAndUser } from "./firestore";
import { setDoc, addDoc, serverTimestamp, deleteDoc, getDocs, collection, doc, writeBatch, query, where } from "firebase/firestore";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
}));

const mockBatch = {
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({ _mockDb: true })),
  collection: vi.fn((db, path) => ({ _path: path })),
  doc: vi.fn((db, path, id) => ({ _path: path, _id: id })),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => mockBatch),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(),
}));

describe("firestore utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateDocument", () => {
    it("calls setDoc with merge mode", async () => {
      const path = "clients";
      const id = "client123";
      const data = { name: "Updated Client" };

      await updateDocument(path, id, data);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: path, _id: id }),
        expect.objectContaining(data),
        { merge: true }
      );
    });

    it("adds updatedAt timestamp to the data", async () => {
      const path = "clients";
      const id = "client123";
      const data = { name: "Updated Client" };

      await updateDocument(path, id, data);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...data,
          updatedAt: { _serverTimestamp: true },
        }),
        { merge: true }
      );
    });

    it("preserves all original data fields", async () => {
      const path = "events/event1/brands";
      const id = "brand456";
      const data = {
        name: "Brand Name",
        websiteUrl: "https://example.com",
        logoUrl: "https://example.com/logo.png",
      };

      await updateDocument(path, id, data);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: "Brand Name",
          websiteUrl: "https://example.com",
          logoUrl: "https://example.com/logo.png",
          updatedAt: { _serverTimestamp: true },
        }),
        { merge: true }
      );
    });
  });

  describe("addDocument", () => {
    it("adds createdAt timestamp when creating a document", async () => {
      const path = "clients";
      const data = { name: "New Client" };

      (addDoc as any).mockResolvedValue({ id: "new-id" });

      await addDocument(path, data);

      expect(addDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: path }),
        expect.objectContaining({
          ...data,
          createdAt: { _serverTimestamp: true },
        })
      );
    });
  });

  describe("deleteEventCascade", () => {
    const EVENT_SUBCOLLECTIONS = [
      "brands", "sessions", "happenings", "participants",
      "posts", "whitelist", "stands", "users",
    ];

    beforeEach(() => {
      mockBatch.delete.mockClear();
      mockBatch.commit.mockClear().mockResolvedValue(undefined);
      (deleteDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({ docs: [] });
    });

    it("uses batched writes to delete the event", async () => {
      await deleteEventCascade("clients/c1/events", "event-1");

      // Should call batch.delete for the event doc and batch.commit
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("queries all known subcollections", async () => {
      await deleteEventCascade("clients/c1/events", "event-1");

      for (const sub of EVENT_SUBCOLLECTIONS) {
        expect(collection).toHaveBeenCalledWith(
          expect.anything(),
          `clients/c1/events/event-1/${sub}`
        );
      }
    });

    it("batch-deletes all documents found in subcollections plus event doc", async () => {
      (getDocs as any).mockImplementation((colRef: { _path: string }) => {
        if (colRef._path?.includes("brands")) {
          return Promise.resolve({
            docs: [
              { ref: { _path: "brands", _id: "brand-1" } },
              { ref: { _path: "brands", _id: "brand-2" } },
            ],
          });
        }
        if (colRef._path?.includes("sessions")) {
          return Promise.resolve({
            docs: [{ ref: { _path: "sessions", _id: "session-1" } }],
          });
        }
        return Promise.resolve({ docs: [] });
      });

      await deleteEventCascade("clients/c1/events", "event-1");

      // 3 subcollection docs + 1 event doc = 4 batch.delete calls
      expect(mockBatch.delete).toHaveBeenCalledTimes(4);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteClientCascade", () => {
    beforeEach(() => {
      mockBatch.delete.mockClear();
      mockBatch.commit.mockClear().mockResolvedValue(undefined);
      (deleteDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({ docs: [] });
    });

    it("deletes the client document itself", async () => {
      await deleteClientCascade("c1");

      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients", _id: "c1" })
      );
    });

    it("fetches events under the client", async () => {
      await deleteClientCascade("c1");

      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        "clients/c1/events"
      );
    });

    it("deletes each event via batch and the client doc via deleteDoc", async () => {
      let callCount = 0;
      (getDocs as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetching events
          return Promise.resolve({
            docs: [
              { id: "event-1", ref: {} },
              { id: "event-2", ref: {} },
            ],
          });
        }
        // Subsequent calls: subcollection queries return empty
        return Promise.resolve({ docs: [] });
      });

      await deleteClientCascade("c1");

      // Event docs are deleted via batched writes (deleteEventCascade uses writeBatch)
      // Each event has 0 subcollection docs + 1 event doc = 1 batch.delete per event
      expect(mockBatch.delete).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients/c1/events", _id: "event-1" })
      );
      expect(mockBatch.delete).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients/c1/events", _id: "event-2" })
      );
      // Client doc itself is deleted via deleteDoc
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients", _id: "c1" })
      );
    });
  });

  describe("batchUpdateWhitelistAndUser", () => {
    beforeEach(() => {
      mockBatch.set.mockClear();
      mockBatch.commit.mockClear();
      (getDocs as any).mockResolvedValue({ docs: [] });
    });

    it("writes whitelist entry and user profile update in a single batch", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [{ id: "user-1", data: () => ({ email: "a@b.com" }) }],
      });

      await batchUpdateWhitelistAndUser({
        whitelistPath: "clients/c1/events/e1/whitelist",
        whitelistId: "wl-1",
        whitelistData: { email: "a@b.com", accessTier: "vip" },
        usersPath: "clients/c1/events/e1/users",
        email: "a@b.com",
        lockedFields: ["accessTier"],
      });

      // Should call batch.set twice (whitelist + user) and commit once
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it("only writes whitelist entry when no matching user exists", async () => {
      (getDocs as any).mockResolvedValue({ docs: [] });

      await batchUpdateWhitelistAndUser({
        whitelistPath: "clients/c1/events/e1/whitelist",
        whitelistId: "wl-1",
        whitelistData: { email: "new@user.com", accessTier: "regular" },
        usersPath: "clients/c1/events/e1/users",
        email: "new@user.com",
        lockedFields: ["accessTier"],
      });

      // Only whitelist write, no user update
      expect(mockBatch.set).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it("only writes whitelist entry when lockedFields is empty", async () => {
      await batchUpdateWhitelistAndUser({
        whitelistPath: "clients/c1/events/e1/whitelist",
        whitelistId: null,
        whitelistData: { email: "a@b.com", accessTier: "regular" },
        usersPath: "clients/c1/events/e1/users",
        email: "a@b.com",
        lockedFields: [],
      });

      // Only whitelist write (addDoc path), no user query
      expect(getDocs).not.toHaveBeenCalled();
    });

    it("uses addDoc when whitelistId is null (new entry)", async () => {
      (addDoc as any).mockResolvedValue({ id: "new-wl-id" });

      await batchUpdateWhitelistAndUser({
        whitelistPath: "clients/c1/events/e1/whitelist",
        whitelistId: null,
        whitelistData: { email: "a@b.com", accessTier: "regular" },
        usersPath: "clients/c1/events/e1/users",
        email: "a@b.com",
        lockedFields: [],
      });

      expect(addDoc).toHaveBeenCalled();
    });

    it("propagates batch commit errors", async () => {
      mockBatch.commit.mockRejectedValueOnce(new Error("Batch failed"));

      (getDocs as any).mockResolvedValue({
        docs: [{ id: "user-1", data: () => ({ email: "a@b.com" }) }],
      });

      await expect(
        batchUpdateWhitelistAndUser({
          whitelistPath: "clients/c1/events/e1/whitelist",
          whitelistId: "wl-1",
          whitelistData: { email: "a@b.com", accessTier: "vip" },
          usersPath: "clients/c1/events/e1/users",
          email: "a@b.com",
          lockedFields: ["accessTier"],
        })
      ).rejects.toThrow("Batch failed");
    });
  });
});
