import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDocument, addDocument, deleteEventCascade, deleteClientCascade } from "./firestore";
import { setDoc, addDoc, serverTimestamp, deleteDoc, getDocs, collection, doc } from "firebase/firestore";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
}));

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
      (deleteDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({ docs: [] });
    });

    it("deletes the event document itself", async () => {
      await deleteEventCascade("clients/c1/events", "event-1");

      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients/c1/events", _id: "event-1" })
      );
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

    it("deletes all documents found in subcollections", async () => {
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

      // 3 subcollection docs + 1 event doc = 4 deleteDoc calls
      expect(deleteDoc).toHaveBeenCalledTimes(4);
    });
  });

  describe("deleteClientCascade", () => {
    beforeEach(() => {
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

    it("deletes each event and the client doc", async () => {
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

      // Should delete both event docs + client doc
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients/c1/events", _id: "event-1" })
      );
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients/c1/events", _id: "event-2" })
      );
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "clients", _id: "c1" })
      );
    });
  });
});
