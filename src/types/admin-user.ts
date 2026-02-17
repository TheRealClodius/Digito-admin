/**
 * Admin User Types for MongoDB
 *
 * Represents users in the goodgest-admin database (adminUsers collection)
 * These are admin users who manage the Goodgest ecosystem via this dashboard
 */

import { ObjectId } from 'mongodb';

/**
 * Role-based access control levels
 * - superadmin: Full access to all clients and events
 * - clientAdmin: Access to specific clients and all their events
 * - eventAdmin: Access to specific events only
 */
export type AdminRole = 'superadmin' | 'clientAdmin' | 'eventAdmin';

/**
 * Supported UI languages
 */
export type Language = 'en' | 'it';

/**
 * Admin user document structure in MongoDB
 * Collection: adminUsers (in goodgest-admin database)
 */
export interface AdminUser {
  _id: ObjectId;

  /** Cognito user ID (immutable) - primary link to AWS Cognito */
  cognitoSub: string;

  /** Email address (lowercase, unique index) */
  email: string;

  /** Access control role */
  role: AdminRole;

  /**
   * Client access scope
   * - null = all clients (for superadmin)
   * - [] = no clients
   * - [...ids] = specific clients
   */
  clientIds: string[] | null;

  /**
   * Event access scope
   * - null = all events (for superadmin/clientAdmin within their clients)
   * - [] = no events
   * - [...codes] = specific event codes (MongoDB database names)
   */
  eventCodes: string[] | null;

  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /** Whether the user can log in and access the system */
  isActive: boolean;

  /** Preferred UI language */
  language: Language;

  /** When this user record was created */
  createdAt: Date;

  /** When this user record was last updated */
  updatedAt: Date;

  /** Cognito sub of the user who created this record */
  createdBy: string;

  /** Cognito sub of the user who last updated this record */
  updatedBy: string;
}

/**
 * Input type for creating a new admin user (without auto-generated fields)
 */
export interface CreateAdminUserInput {
  email: string;
  role: AdminRole;
  clientIds: string[] | null;
  eventCodes: string[] | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  language: Language;
  createdBy: string; // cognitoSub of the creator
}

/**
 * Input type for updating an admin user (all fields optional except updatedBy)
 */
export interface UpdateAdminUserInput {
  email?: string;
  role?: AdminRole;
  clientIds?: string[] | null;
  eventCodes?: string[] | null;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  language?: Language;
  updatedBy: string; // cognitoSub of the updater
}
