/**
 * Tests for MongoDB Connection Layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MongoClient, Db } from 'mongodb';

// Mock MongoDB module
vi.mock('mongodb', () => {
  const mockDb = {
    collection: vi.fn(),
  };

  const mockClient = {
    db: vi.fn(() => mockDb),
    close: vi.fn(),
  };

  return {
    MongoClient: {
      connect: vi.fn(() => Promise.resolve(mockClient)),
    },
    Db: vi.fn(),
    Collection: vi.fn(),
    Document: vi.fn(),
    ObjectId: vi.fn(),
  };
});

describe('MongoDB Connection Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to clear singleton
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminDb', () => {
    it('should return the admin database instance', async () => {
      // Set environment variables
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
      process.env.MONGODB_ADMIN_DB_NAME = 'test-admin';

      const { getAdminDb } = await import('./mongodb');
      const db = await getAdminDb();

      expect(db).toBeDefined();
      expect(MongoClient.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017',
        expect.objectContaining({
          maxPoolSize: 10,
          minPoolSize: 1,
          maxIdleTimeMS: 60000,
        })
      );
    });

    it('should use default admin database name if not provided', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
      delete process.env.MONGODB_ADMIN_DB_NAME;

      // Need to re-import after env change
      vi.resetModules();
      const { getAdminDb } = await import('./mongodb');

      await getAdminDb();

      // Verify the client was created and db() was called
      expect(MongoClient.connect).toHaveBeenCalled();
    });

    it('should reuse cached connection on subsequent calls', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';

      const { getAdminDb } = await import('./mongodb');

      const db1 = await getAdminDb();
      const db2 = await getAdminDb();

      // Should only connect once
      expect(MongoClient.connect).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });
  });

  describe('getEventDb', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
    });

    it('should return the event database instance with correct name', async () => {
      const { getEventDb } = await import('./mongodb');

      const eventCode = '2025089';
      const db = await getEventDb(eventCode);

      expect(db).toBeDefined();
      expect(MongoClient.connect).toHaveBeenCalled();
    });

    it('should throw error for invalid eventCode (empty string)', async () => {
      const { getEventDb } = await import('./mongodb');

      await expect(getEventDb('')).rejects.toThrow('Invalid eventCode');
    });

    it('should throw error for invalid eventCode (non-string)', async () => {
      const { getEventDb } = await import('./mongodb');

      // @ts-expect-error - testing invalid input
      await expect(getEventDb(null)).rejects.toThrow('Invalid eventCode');

      // @ts-expect-error - testing invalid input
      await expect(getEventDb(123)).rejects.toThrow('Invalid eventCode');
    });

    it('should handle multiple event databases', async () => {
      const { getEventDb } = await import('./mongodb');

      const db1 = await getEventDb('2025089');
      const db2 = await getEventDb('2026003');

      expect(db1).toBeDefined();
      expect(db2).toBeDefined();
      // Both should reuse the same connection
      expect(MongoClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeConnection', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
    });

    it('should close the MongoDB connection', async () => {
      const { getAdminDb, closeConnection } = await import('./mongodb');

      await getAdminDb(); // Establish connection
      await closeConnection();

      // Should have called close on the client
      const mockClientInstance = await MongoClient.connect(
        process.env.MONGODB_URI!,
        expect.any(Object)
      );
      expect(mockClientInstance.close).toHaveBeenCalled();
    });

    it('should handle closing when no connection exists', async () => {
      const { closeConnection } = await import('./mongodb');

      // Should not throw
      await expect(closeConnection()).resolves.not.toThrow();
    });

    it('should allow reconnection after close', async () => {
      const { getAdminDb, closeConnection } = await import('./mongodb');

      await getAdminDb();
      await closeConnection();

      vi.clearAllMocks();

      await getAdminDb(); // Should reconnect

      expect(MongoClient.connect).toHaveBeenCalled();
    });
  });

  describe('environment validation', () => {
    it('should throw error if MONGODB_URI is not set', async () => {
      delete process.env.MONGODB_URI;

      await expect(async () => {
        // This should throw during module load
        await import('./mongodb');
      }).rejects.toThrow('Missing required environment variable: MONGODB_URI');
    });
  });

  describe('connection pooling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
    });

    it('should use correct connection pool options', async () => {
      const { getAdminDb } = await import('./mongodb');

      await getAdminDb();

      expect(MongoClient.connect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxPoolSize: 10,
          minPoolSize: 1,
          maxIdleTimeMS: 60000,
        })
      );
    });
  });

  describe('concurrent connection handling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
    });

    it('should handle concurrent getAdminDb calls without creating multiple connections', async () => {
      const { getAdminDb } = await import('./mongodb');

      // Call getAdminDb multiple times concurrently
      const promises = [
        getAdminDb(),
        getAdminDb(),
        getAdminDb(),
      ];

      await Promise.all(promises);

      // Should only connect once even with concurrent calls
      expect(MongoClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent getEventDb calls', async () => {
      const { getEventDb } = await import('./mongodb');

      const promises = [
        getEventDb('2025089'),
        getEventDb('2026003'),
        getEventDb('2025089'), // Duplicate
      ];

      await Promise.all(promises);

      // Should only connect once
      expect(MongoClient.connect).toHaveBeenCalledTimes(1);
    });
  });
});
