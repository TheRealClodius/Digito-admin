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
 * Client-Event document in MongoDB (clientEvents collection)
 * Stores full event metadata in the master database
 */
export interface ClientEventDocument {
  _id: ObjectId;
  /** Reference to the client */
  clientId: ObjectId;
  /** Event code (MongoDB database name, e.g., "2025089") */
  eventCode: string;
  /** Event display name */
  name: string;
  description: string | null;
  venue: string | null;
  startDate: Date;
  endDate: Date;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  chatPrompt: string | null;
  imageUrls: string[] | null;
  /** Whether this event is currently active */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
 * Input type for creating a client-event
 */
export interface CreateClientEventInput {
  clientId: ObjectId;
  eventCode: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  startDate: Date;
  endDate: Date;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  chatPrompt?: string | null;
  imageUrls?: string[] | null;
  isActive: boolean;
}

/**
 * Input type for updating a client-event
 */
export interface UpdateClientEventInput {
  name?: string;
  description?: string | null;
  venue?: string | null;
  startDate?: Date;
  endDate?: Date;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  chatPrompt?: string | null;
  imageUrls?: string[] | null;
  isActive?: boolean;
}
