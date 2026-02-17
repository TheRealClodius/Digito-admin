/**
 * Tests for MongoDB Collections Accessor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the mongodb module
const mockCollection = vi.fn();
const mockDb = {
  collection: mockCollection,
};

vi.mock('./mongodb', () => ({
  getAdminDb: vi.fn(() => Promise.resolve(mockDb)),
  getEventDb: vi.fn(() => Promise.resolve(mockDb)),
}));

import { getAdminDb, getEventDb } from './mongodb';
import {
  getAdminUsersCollection,
  getClientsCollection,
  getClientEventsCollection,
  getEventCollection,
  EVENT_COLLECTIONS,
} from './mongodb-collections';

describe('MongoDB Collections Accessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminUsersCollection', () => {
    it('should return the adminUsers collection', async () => {
      const mockAdminUsersCollection = { name: 'adminUsers' };
      mockCollection.mockReturnValue(mockAdminUsersCollection);

      const collection = await getAdminUsersCollection();

      expect(getAdminDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('adminUsers');
      expect(collection).toBe(mockAdminUsersCollection);
    });

    it('should use the admin database', async () => {
      await getAdminUsersCollection();

      expect(getAdminDb).toHaveBeenCalledTimes(1);
      expect(getEventDb).not.toHaveBeenCalled();
    });
  });

  describe('getClientsCollection', () => {
    it('should return the clients collection', async () => {
      const mockClientsCollection = { name: 'clients' };
      mockCollection.mockReturnValue(mockClientsCollection);

      const collection = await getClientsCollection();

      expect(getAdminDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('clients');
      expect(collection).toBe(mockClientsCollection);
    });

    it('should use the admin database', async () => {
      await getClientsCollection();

      expect(getAdminDb).toHaveBeenCalledTimes(1);
      expect(getEventDb).not.toHaveBeenCalled();
    });
  });

  describe('getClientEventsCollection', () => {
    it('should return the clientEvents collection', async () => {
      const mockClientEventsCollection = { name: 'clientEvents' };
      mockCollection.mockReturnValue(mockClientEventsCollection);

      const collection = await getClientEventsCollection();

      expect(getAdminDb).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('clientEvents');
      expect(collection).toBe(mockClientEventsCollection);
    });

    it('should use the admin database', async () => {
      await getClientEventsCollection();

      expect(getAdminDb).toHaveBeenCalledTimes(1);
      expect(getEventDb).not.toHaveBeenCalled();
    });
  });

  describe('getEventCollection', () => {
    it('should return the specified collection from the event database', async () => {
      const mockEventCollection = { name: 'participants' };
      mockCollection.mockReturnValue(mockEventCollection);

      const eventCode = '2025089';
      const collectionName = 'participants';

      const collection = await getEventCollection(eventCode, collectionName);

      expect(getEventDb).toHaveBeenCalledWith(eventCode);
      expect(mockCollection).toHaveBeenCalledWith(collectionName);
      expect(collection).toBe(mockEventCollection);
    });

    it('should use the event database, not admin', async () => {
      await getEventCollection('2025089', 'posts');

      expect(getEventDb).toHaveBeenCalledTimes(1);
      expect(getAdminDb).not.toHaveBeenCalled();
    });

    it('should work with different event codes', async () => {
      const mockCollection1 = { name: 'posts-2025089' };
      const mockCollection2 = { name: 'posts-2026003' };

      mockCollection
        .mockReturnValueOnce(mockCollection1)
        .mockReturnValueOnce(mockCollection2);

      const collection1 = await getEventCollection('2025089', 'posts');
      const collection2 = await getEventCollection('2026003', 'posts');

      expect(getEventDb).toHaveBeenCalledWith('2025089');
      expect(getEventDb).toHaveBeenCalledWith('2026003');
      expect(collection1).toBe(mockCollection1);
      expect(collection2).toBe(mockCollection2);
    });

    it('should work with different collection names', async () => {
      await getEventCollection('2025089', 'brands');
      expect(mockCollection).toHaveBeenCalledWith('brands');

      vi.clearAllMocks();

      await getEventCollection('2025089', 'sessions');
      expect(mockCollection).toHaveBeenCalledWith('sessions');

      vi.clearAllMocks();

      await getEventCollection('2025089', 'participants');
      expect(mockCollection).toHaveBeenCalledWith('participants');
    });

    it('should accept generic type parameter', async () => {
      interface CustomDocument {
        _id: string;
        customField: string;
      }

      const mockCustomCollection = { name: 'custom' };
      mockCollection.mockReturnValue(mockCustomCollection);

      // This should compile without type errors
      const collection = await getEventCollection<CustomDocument>(
        '2025089',
        'custom'
      );

      expect(collection).toBe(mockCustomCollection);
    });
  });

  describe('EVENT_COLLECTIONS constant', () => {
    it('should contain all standard event collection names', () => {
      expect(EVENT_COLLECTIONS).toEqual({
        BRANDS: 'brands',
        SESSIONS: 'sessions',
        HAPPENINGS: 'happenings',
        PARTICIPANTS: 'participants',
        POSTS: 'posts',
        WHITELIST: 'whitelist',
        STANDS: 'stands',
        USERS: 'users',
        FEEDBACK: 'feedback',
      });
    });

    it('should be a constant (readonly)', () => {
      // This test verifies the type is marked as const
      // TypeScript should prevent mutations at compile time
      expect(EVENT_COLLECTIONS).toBeDefined();
      expect(Object.isFrozen(EVENT_COLLECTIONS)).toBe(false); // as const doesn't freeze at runtime
    });

    it('should have string values', () => {
      Object.values(EVENT_COLLECTIONS).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('multiple collection access patterns', () => {
    it('should support accessing multiple collections in sequence', async () => {
      await getAdminUsersCollection();
      await getClientsCollection();
      await getEventCollection('2025089', 'posts');

      expect(getAdminDb).toHaveBeenCalledTimes(2);
      expect(getEventDb).toHaveBeenCalledTimes(1);
    });

    it('should support parallel collection access', async () => {
      const promises = [
        getAdminUsersCollection(),
        getClientsCollection(),
        getEventCollection('2025089', 'posts'),
        getEventCollection('2026003', 'brands'),
      ];

      await Promise.all(promises);

      expect(getAdminDb).toHaveBeenCalledTimes(2);
      expect(getEventDb).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getAdminDb', async () => {
      const mockError = new Error('Admin DB connection failed');
      vi.mocked(getAdminDb).mockRejectedValueOnce(mockError);

      await expect(getAdminUsersCollection()).rejects.toThrow(
        'Admin DB connection failed'
      );
    });

    it('should propagate errors from getEventDb', async () => {
      const mockError = new Error('Event DB connection failed');
      vi.mocked(getEventDb).mockRejectedValueOnce(mockError);

      await expect(getEventCollection('2025089', 'posts')).rejects.toThrow(
        'Event DB connection failed'
      );
    });

    it('should propagate errors from db.collection()', async () => {
      const mockError = new Error('Collection not found');
      mockCollection.mockImplementationOnce(() => {
        throw mockError;
      });

      await expect(getAdminUsersCollection()).rejects.toThrow(
        'Collection not found'
      );
    });
  });
});
