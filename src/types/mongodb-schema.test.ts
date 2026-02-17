/**
 * Tests for MongoDB Schema Types
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
  ClientDocument,
  ClientEventDocument,
  CreateClientInput,
  UpdateClientInput,
  CreateClientEventInput,
  UpdateClientEventInput,
} from './mongodb-schema';

describe('MongoDB Schema Types', () => {
  describe('ClientDocument interface', () => {
    it('should create a valid client document', () => {
      const client: ClientDocument = {
        _id: new ObjectId(),
        name: 'Test Client',
        description: 'A test client',
        logoUrl: 'https://example.com/logo.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(client._id).toBeInstanceOf(ObjectId);
      expect(client.name).toBe('Test Client');
      expect(client.description).toBe('A test client');
      expect(client.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should allow null for optional fields', () => {
      const client: ClientDocument = {
        _id: new ObjectId(),
        name: 'Minimal Client',
        description: null,
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(client.description).toBeNull();
      expect(client.logoUrl).toBeNull();
    });

    it('should have both createdAt and updatedAt dates', () => {
      const now = new Date();
      const client: ClientDocument = {
        _id: new ObjectId(),
        name: 'Client',
        description: null,
        logoUrl: null,
        createdAt: now,
        updatedAt: now,
      };

      expect(client.createdAt).toBeInstanceOf(Date);
      expect(client.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('ClientEventDocument interface', () => {
    it('should create a valid client-event mapping', () => {
      const clientEvent: ClientEventDocument = {
        _id: new ObjectId(),
        clientId: new ObjectId(),
        eventCode: '2025089',
        eventName: 'Test Event 2025',
        isActive: true,
        createdAt: new Date(),
      };

      expect(clientEvent._id).toBeInstanceOf(ObjectId);
      expect(clientEvent.clientId).toBeInstanceOf(ObjectId);
      expect(clientEvent.eventCode).toBe('2025089');
      expect(clientEvent.eventName).toBe('Test Event 2025');
      expect(clientEvent.isActive).toBe(true);
    });

    it('should support inactive events', () => {
      const inactiveEvent: ClientEventDocument = {
        _id: new ObjectId(),
        clientId: new ObjectId(),
        eventCode: '2024001',
        eventName: 'Past Event',
        isActive: false,
        createdAt: new Date(),
      };

      expect(inactiveEvent.isActive).toBe(false);
    });

    it('should use eventCode as the MongoDB database identifier', () => {
      const event: ClientEventDocument = {
        _id: new ObjectId(),
        clientId: new ObjectId(),
        eventCode: '2026003',
        eventName: 'Future Event',
        isActive: true,
        createdAt: new Date(),
      };

      // The eventCode should be a string that can be used as a database name
      expect(typeof event.eventCode).toBe('string');
      expect(event.eventCode).toMatch(/^\d+$/); // Typically numeric
    });
  });

  describe('CreateClientInput interface', () => {
    it('should create a valid input for creating a client', () => {
      const input: CreateClientInput = {
        name: 'New Client',
        description: 'A new client description',
        logoUrl: 'https://example.com/logo.png',
      };

      expect(input.name).toBe('New Client');
      expect(input.description).toBe('A new client description');
      expect(input.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should allow null values for optional fields', () => {
      const input: CreateClientInput = {
        name: 'Client Without Details',
        description: null,
        logoUrl: null,
      };

      expect(input.description).toBeNull();
      expect(input.logoUrl).toBeNull();
    });

    it('should not include auto-generated fields', () => {
      const input: CreateClientInput = {
        name: 'Client',
        description: null,
        logoUrl: null,
      };

      // These should not exist in CreateClientInput
      expect('_id' in input).toBe(false);
      expect('createdAt' in input).toBe(false);
      expect('updatedAt' in input).toBe(false);
    });
  });

  describe('UpdateClientInput interface', () => {
    it('should create a valid update with all fields', () => {
      const update: UpdateClientInput = {
        name: 'Updated Name',
        description: 'Updated description',
        logoUrl: 'https://example.com/new-logo.png',
      };

      expect(update.name).toBe('Updated Name');
      expect(update.description).toBe('Updated description');
      expect(update.logoUrl).toBe('https://example.com/new-logo.png');
    });

    it('should create a valid partial update', () => {
      const update: UpdateClientInput = {
        name: 'Only Name Updated',
      };

      expect(update.name).toBe('Only Name Updated');
      expect(update.description).toBeUndefined();
      expect(update.logoUrl).toBeUndefined();
    });

    it('should allow setting fields to null', () => {
      const update: UpdateClientInput = {
        description: null,
        logoUrl: null,
      };

      expect(update.description).toBeNull();
      expect(update.logoUrl).toBeNull();
    });

    it('should allow updating only the logo', () => {
      const update: UpdateClientInput = {
        logoUrl: 'https://example.com/logo2.png',
      };

      expect(update.logoUrl).toBe('https://example.com/logo2.png');
      expect(update.name).toBeUndefined();
    });
  });

  describe('CreateClientEventInput interface', () => {
    it('should create a valid input for creating a client-event mapping', () => {
      const input: CreateClientEventInput = {
        clientId: new ObjectId(),
        eventCode: '2025089',
        eventName: 'Test Event',
        isActive: true,
      };

      expect(input.clientId).toBeInstanceOf(ObjectId);
      expect(input.eventCode).toBe('2025089');
      expect(input.eventName).toBe('Test Event');
      expect(input.isActive).toBe(true);
    });

    it('should support creating inactive mappings', () => {
      const input: CreateClientEventInput = {
        clientId: new ObjectId(),
        eventCode: '2024999',
        eventName: 'Archived Event',
        isActive: false,
      };

      expect(input.isActive).toBe(false);
    });

    it('should not include auto-generated fields', () => {
      const input: CreateClientEventInput = {
        clientId: new ObjectId(),
        eventCode: '2025089',
        eventName: 'Event',
        isActive: true,
      };

      // These should not exist in CreateClientEventInput
      expect('_id' in input).toBe(false);
      expect('createdAt' in input).toBe(false);
    });
  });

  describe('UpdateClientEventInput interface', () => {
    it('should create a valid update with all fields', () => {
      const update: UpdateClientEventInput = {
        eventName: 'Updated Event Name',
        isActive: false,
      };

      expect(update.eventName).toBe('Updated Event Name');
      expect(update.isActive).toBe(false);
    });

    it('should allow updating only the event name', () => {
      const update: UpdateClientEventInput = {
        eventName: 'New Name',
      };

      expect(update.eventName).toBe('New Name');
      expect(update.isActive).toBeUndefined();
    });

    it('should allow updating only the active status', () => {
      const update: UpdateClientEventInput = {
        isActive: true,
      };

      expect(update.isActive).toBe(true);
      expect(update.eventName).toBeUndefined();
    });

    it('should allow activating an event', () => {
      const update: UpdateClientEventInput = {
        isActive: true,
      };

      expect(update.isActive).toBe(true);
    });

    it('should allow deactivating an event', () => {
      const update: UpdateClientEventInput = {
        isActive: false,
      };

      expect(update.isActive).toBe(false);
    });
  });

  describe('Type relationships', () => {
    it('should link ClientEventDocument to ClientDocument via clientId', () => {
      const clientId = new ObjectId();

      const client: ClientDocument = {
        _id: clientId,
        name: 'Test Client',
        description: null,
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const clientEvent: ClientEventDocument = {
        _id: new ObjectId(),
        clientId: clientId, // References the client
        eventCode: '2025089',
        eventName: 'Event',
        isActive: true,
        createdAt: new Date(),
      };

      expect(clientEvent.clientId.equals(client._id)).toBe(true);
    });

    it('should support multiple events per client', () => {
      const clientId = new ObjectId();

      const event1: ClientEventDocument = {
        _id: new ObjectId(),
        clientId: clientId,
        eventCode: '2025089',
        eventName: 'Event 1',
        isActive: true,
        createdAt: new Date(),
      };

      const event2: ClientEventDocument = {
        _id: new ObjectId(),
        clientId: clientId,
        eventCode: '2026003',
        eventName: 'Event 2',
        isActive: true,
        createdAt: new Date(),
      };

      expect(event1.clientId.equals(event2.clientId)).toBe(true);
      expect(event1.eventCode).not.toBe(event2.eventCode);
    });
  });
});
