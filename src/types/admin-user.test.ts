/**
 * Tests for Admin User Types
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
  AdminUser,
  AdminRole,
  Language,
  CreateAdminUserInput,
  UpdateAdminUserInput,
} from './admin-user';

describe('Admin User Types', () => {
  describe('AdminRole', () => {
    it('should accept valid role values', () => {
      const superadmin: AdminRole = 'superadmin';
      const clientAdmin: AdminRole = 'clientAdmin';
      const eventAdmin: AdminRole = 'eventAdmin';

      expect(superadmin).toBe('superadmin');
      expect(clientAdmin).toBe('clientAdmin');
      expect(eventAdmin).toBe('eventAdmin');
    });
  });

  describe('Language', () => {
    it('should accept valid language values', () => {
      const en: Language = 'en';
      const it: Language = 'it';

      expect(en).toBe('en');
      expect(it).toBe('it');
    });
  });

  describe('AdminUser interface', () => {
    it('should create a valid superadmin user object', () => {
      const superadmin: AdminUser = {
        _id: new ObjectId(),
        cognitoSub: 'cognito-123',
        email: 'admin@goodgest.com',
        role: 'superadmin',
        clientIds: null, // null = all clients
        eventCodes: null, // null = all events
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cognito-123',
        updatedBy: 'cognito-123',
      };

      expect(superadmin._id).toBeInstanceOf(ObjectId);
      expect(superadmin.role).toBe('superadmin');
      expect(superadmin.clientIds).toBeNull();
      expect(superadmin.eventCodes).toBeNull();
    });

    it('should create a valid clientAdmin user object', () => {
      const clientAdmin: AdminUser = {
        _id: new ObjectId(),
        cognitoSub: 'cognito-456',
        email: 'client-admin@example.com',
        role: 'clientAdmin',
        clientIds: ['client-1', 'client-2'],
        eventCodes: null, // null = all events in assigned clients
        firstName: 'Client',
        lastName: 'Admin',
        isActive: true,
        language: 'it',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cognito-123',
        updatedBy: 'cognito-123',
      };

      expect(clientAdmin.role).toBe('clientAdmin');
      expect(clientAdmin.clientIds).toEqual(['client-1', 'client-2']);
      expect(clientAdmin.eventCodes).toBeNull();
    });

    it('should create a valid eventAdmin user object', () => {
      const eventAdmin: AdminUser = {
        _id: new ObjectId(),
        cognitoSub: 'cognito-789',
        email: 'event-admin@example.com',
        role: 'eventAdmin',
        clientIds: ['client-1'],
        eventCodes: ['2025089', '2026003'],
        firstName: 'Event',
        lastName: 'Admin',
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cognito-456',
        updatedBy: 'cognito-456',
      };

      expect(eventAdmin.role).toBe('eventAdmin');
      expect(eventAdmin.clientIds).toEqual(['client-1']);
      expect(eventAdmin.eventCodes).toEqual(['2025089', '2026003']);
    });

    it('should support inactive users', () => {
      const inactiveUser: AdminUser = {
        _id: new ObjectId(),
        cognitoSub: 'cognito-inactive',
        email: 'inactive@example.com',
        role: 'eventAdmin',
        clientIds: [],
        eventCodes: [],
        firstName: 'Inactive',
        lastName: 'User',
        isActive: false,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cognito-123',
        updatedBy: 'cognito-123',
      };

      expect(inactiveUser.isActive).toBe(false);
    });
  });

  describe('CreateAdminUserInput interface', () => {
    it('should create a valid input for creating a superadmin', () => {
      const input: CreateAdminUserInput = {
        email: 'new-admin@goodgest.com',
        role: 'superadmin',
        clientIds: null,
        eventCodes: null,
        firstName: 'New',
        lastName: 'Admin',
        isActive: true,
        language: 'en',
        createdBy: 'cognito-123',
      };

      expect(input.email).toBe('new-admin@goodgest.com');
      expect(input.role).toBe('superadmin');
    });

    it('should create a valid input for creating a clientAdmin', () => {
      const input: CreateAdminUserInput = {
        email: 'new-client-admin@example.com',
        role: 'clientAdmin',
        clientIds: ['client-1'],
        eventCodes: null,
        firstName: 'New',
        lastName: 'ClientAdmin',
        isActive: true,
        language: 'it',
        createdBy: 'cognito-123',
      };

      expect(input.role).toBe('clientAdmin');
      expect(input.clientIds).toEqual(['client-1']);
    });

    it('should create a valid input for creating an eventAdmin', () => {
      const input: CreateAdminUserInput = {
        email: 'new-event-admin@example.com',
        role: 'eventAdmin',
        clientIds: ['client-1'],
        eventCodes: ['2025089'],
        firstName: 'New',
        lastName: 'EventAdmin',
        isActive: true,
        language: 'en',
        createdBy: 'cognito-456',
      };

      expect(input.role).toBe('eventAdmin');
      expect(input.eventCodes).toEqual(['2025089']);
    });
  });

  describe('UpdateAdminUserInput interface', () => {
    it('should create a valid update with all fields', () => {
      const update: UpdateAdminUserInput = {
        email: 'updated@example.com',
        role: 'clientAdmin',
        clientIds: ['client-2'],
        eventCodes: null,
        firstName: 'Updated',
        lastName: 'Name',
        isActive: false,
        language: 'it',
        updatedBy: 'cognito-123',
      };

      expect(update.email).toBe('updated@example.com');
      expect(update.updatedBy).toBe('cognito-123');
    });

    it('should create a valid partial update', () => {
      const update: UpdateAdminUserInput = {
        isActive: false,
        updatedBy: 'cognito-123',
      };

      expect(update.isActive).toBe(false);
      expect(update.email).toBeUndefined();
      expect(update.role).toBeUndefined();
    });

    it('should allow updating only the role', () => {
      const update: UpdateAdminUserInput = {
        role: 'eventAdmin',
        updatedBy: 'cognito-123',
      };

      expect(update.role).toBe('eventAdmin');
    });

    it('should allow updating clientIds and eventCodes', () => {
      const update: UpdateAdminUserInput = {
        clientIds: ['client-3', 'client-4'],
        eventCodes: ['2026003'],
        updatedBy: 'cognito-456',
      };

      expect(update.clientIds).toEqual(['client-3', 'client-4']);
      expect(update.eventCodes).toEqual(['2026003']);
    });

    it('should require updatedBy field', () => {
      const update: UpdateAdminUserInput = {
        isActive: true,
        updatedBy: 'cognito-123', // Required field
      };

      expect(update.updatedBy).toBe('cognito-123');
    });
  });

  describe('Type constraints', () => {
    it('should enforce clientIds as string array or null', () => {
      const user: AdminUser = {
        _id: new ObjectId(),
        cognitoSub: 'cognito-123',
        email: 'test@example.com',
        role: 'clientAdmin',
        clientIds: ['client-1'],
        eventCodes: null,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cognito-123',
        updatedBy: 'cognito-123',
      };

      expect(Array.isArray(user.clientIds)).toBe(true);

      const superadmin: AdminUser = {
        ...user,
        role: 'superadmin',
        clientIds: null,
      };

      expect(superadmin.clientIds).toBeNull();
    });

    it('should enforce eventCodes as string array or null', () => {
      const user: AdminUser = {
        _id: new ObjectId(),
        cognitoSub: 'cognito-123',
        email: 'test@example.com',
        role: 'eventAdmin',
        clientIds: ['client-1'],
        eventCodes: ['2025089', '2026003'],
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cognito-123',
        updatedBy: 'cognito-123',
      };

      expect(Array.isArray(user.eventCodes)).toBe(true);

      const clientAdmin: AdminUser = {
        ...user,
        role: 'clientAdmin',
        eventCodes: null,
      };

      expect(clientAdmin.eventCodes).toBeNull();
    });
  });
});
