import { vi } from 'vitest';

// --- Collection operation mocks ---
export const mockFind = vi.fn();
export const mockFindOne = vi.fn();
export const mockInsertOne = vi.fn();
export const mockUpdateOne = vi.fn();
export const mockDeleteOne = vi.fn();
export const mockCountDocuments = vi.fn();
export const mockAggregate = vi.fn();

/** A mock Collection object with all standard operations stubbed */
export const mockCollection = {
  find: mockFind,
  findOne: mockFindOne,
  insertOne: mockInsertOne,
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
  countDocuments: mockCountDocuments,
  aggregate: mockAggregate,
};

/** A mock Db object — collection() returns mockCollection */
export const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollection),
};

/** Call inside vi.mock() at the top of test files to mock @/lib/mongodb */
export function setupMongoDbMocks() {
  vi.mock('@/lib/mongodb', () => ({
    getAdminDb: vi.fn().mockResolvedValue(mockDb),
    getEventDb: vi.fn().mockResolvedValue(mockDb),
    closeConnection: vi.fn().mockResolvedValue(undefined),
  }));
}

/**
 * Helper to simulate a find().toArray() chain.
 * Usage: mockFindToArray([{ _id: '1', name: 'Test' }])
 */
export function mockFindToArray<T>(docs: T[]) {
  mockFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) });
}

/**
 * Helper: simulate an aggregate().toArray() chain.
 * Usage: mockAggregateToArray([{ count: 5 }])
 */
export function mockAggregateToArray<T>(docs: T[]) {
  mockAggregate.mockReturnValue({ toArray: vi.fn().mockResolvedValue(docs) });
}

/** Reset all MongoDB mocks between tests */
export function resetMongoDbMocks() {
  vi.clearAllMocks();
  mockDb.collection.mockReturnValue(mockCollection);
}
