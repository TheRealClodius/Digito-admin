import { vi } from "vitest";

// Mock Firebase Auth
export const mockAuth = {
  currentUser: null as { uid: string; email: string } | null,
};

// Mock Firebase Firestore
export const mockDb = {};

// Mock Firebase Storage
export const mockStorage = {};

// Mock Firestore operations
export const mockAddDoc = vi.fn();
export const mockSetDoc = vi.fn();
export const mockDeleteDoc = vi.fn();
export const mockGetDoc = vi.fn();
export const mockGetDocs = vi.fn();
export const mockOnSnapshot = vi.fn();
export const mockCollection = vi.fn();
export const mockDoc = vi.fn();
export const mockQuery = vi.fn();
export const mockOrderBy = vi.fn();
export const mockTimestamp = {
  fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0, toDate: () => date }),
  now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: () => new Date() }),
};

// Setup all Firebase mocks
export function setupFirebaseMocks() {
  vi.mock("@/lib/firebase", () => ({
    auth: mockAuth,
    db: mockDb,
    storage: mockStorage,
    default: {},
  }));

  vi.mock("firebase/firestore", () => ({
    collection: mockCollection,
    doc: mockDoc,
    addDoc: mockAddDoc,
    setDoc: mockSetDoc,
    deleteDoc: mockDeleteDoc,
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    onSnapshot: mockOnSnapshot,
    query: mockQuery,
    orderBy: mockOrderBy,
    Timestamp: mockTimestamp,
    serverTimestamp: () => mockTimestamp.now(),
  }));

  vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(() => mockAuth),
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    GoogleAuthProvider: vi.fn(),
  }));

  vi.mock("firebase/storage", () => ({
    ref: vi.fn(),
    uploadBytesResumable: vi.fn(),
    getDownloadURL: vi.fn(),
    deleteObject: vi.fn(),
    getStorage: vi.fn(() => mockStorage),
  }));
}

// Helper to create mock Firestore snapshot
export function createMockSnapshot<T>(docs: Array<{ id: string } & T>) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => {
        const { id: _id, ...rest } = d;
        return rest;
      },
      exists: () => true,
    })),
    empty: docs.length === 0,
    size: docs.length,
  };
}

// Helper to create a mock single document snapshot
export function createMockDocSnapshot<T>(data: ({ id: string } & T) | null) {
  if (!data) {
    return { exists: () => false, data: () => undefined, id: "" };
  }
  const { id, ...rest } = data;
  return { exists: () => true, data: () => rest, id };
}
