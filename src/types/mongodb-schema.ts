/**
 * MongoDB Schema Types
 *
 * Types representing the actual MongoDB document structures in the goodgest-admin database
 * These differ from the client-facing types (which use string ids and Firebase Timestamps)
 */

import { ObjectId } from 'mongodb';

/**
 * Client document in MongoDB (clients collection)
 */
export interface ClientDocument {
  _id: ObjectId;
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client-Event mapping document in MongoDB (clientEvents collection)
 * Maps which events belong to which clients
 */
export interface ClientEventDocument {
  _id: ObjectId;
  /** Reference to the client */
  clientId: ObjectId;
  /** Event code (MongoDB database name, e.g., "2025089") */
  eventCode: string;
  /** Cached display name for the event */
  eventName: string;
  /** Whether this event is currently active */
  isActive: boolean;
  /** When this mapping was created */
  createdAt: Date;
}

/**
 * Input type for creating a new client
 */
export interface CreateClientInput {
  name: string;
  description: string | null;
  logoUrl: string | null;
}

/**
 * Input type for updating a client
 */
export interface UpdateClientInput {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
}

/**
 * Input type for creating a client-event mapping
 */
export interface CreateClientEventInput {
  clientId: ObjectId;
  eventCode: string;
  eventName: string;
  isActive: boolean;
}

/**
 * Input type for updating a client-event mapping
 */
export interface UpdateClientEventInput {
  eventName?: string;
  isActive?: boolean;
}
