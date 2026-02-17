/**
 * MongoDB Collections Accessor
 *
 * Typed collection accessors for the Goodgest ecosystem:
 * - Master database (goodgest-admin): adminUsers, clients, clientEvents
 * - Event databases (dynamic): accessed via generic helper
 *
 * All accessors return MongoDB Collection instances with proper TypeScript types
 */

import { Collection, Document } from 'mongodb';
import { getAdminDb, getEventDb } from './mongodb';
import type { AdminUser } from '@/types/admin-user';
import type { ClientDocument, ClientEventDocument } from '@/types/mongodb-schema';

/**
 * Get the adminUsers collection from the master database
 * Collection: adminUsers
 * Database: goodgest-admin
 *
 * @returns Typed collection for admin users
 */
export async function getAdminUsersCollection(): Promise<Collection<AdminUser>> {
  const db = await getAdminDb();
  return db.collection<AdminUser>('adminUsers');
}

/**
 * Get the clients collection from the master database
 * Collection: clients
 * Database: goodgest-admin
 *
 * @returns Typed collection for clients
 */
export async function getClientsCollection(): Promise<Collection<ClientDocument>> {
  const db = await getAdminDb();
  return db.collection<ClientDocument>('clients');
}

/**
 * Get the clientEvents collection from the master database
 * Collection: clientEvents (mapping table: client → events)
 * Database: goodgest-admin
 *
 * @returns Typed collection for client-event mappings
 */
export async function getClientEventsCollection(): Promise<Collection<ClientEventDocument>> {
  const db = await getAdminDb();
  return db.collection<ClientEventDocument>('clientEvents');
}

/**
 * Generic helper to access any collection in an event database
 * Event databases are identified by eventCode (e.g., "2025089", "2026003")
 *
 * @param eventCode - The event identifier (MongoDB database name)
 * @param collectionName - The collection name (e.g., "participants", "posts", "sessions")
 * @returns Typed collection from the event database
 *
 * @example
 * // Get participants from event 2025089
 * const participants = await getEventCollection("2025089", "participants");
 * const allParticipants = await participants.find().toArray();
 *
 * @example
 * // Get posts from event 2026003 with typed interface
 * interface Post {
 *   _id: ObjectId;
 *   content: string;
 *   authorId: string;
 *   createdAt: Date;
 * }
 * const posts = await getEventCollection<Post>("2026003", "posts");
 * const recentPosts = await posts.find().sort({ createdAt: -1 }).limit(10).toArray();
 */
export async function getEventCollection<T extends Document = Document>(
  eventCode: string,
  collectionName: string
): Promise<Collection<T>> {
  const db = await getEventDb(eventCode);
  return db.collection<T>(collectionName);
}

/**
 * Collection names used in event databases
 * This is a reference list - actual collection names may vary per event
 * Use getEventCollection() to access these dynamically
 */
export const EVENT_COLLECTIONS = {
  BRANDS: 'brands',
  SESSIONS: 'sessions',
  HAPPENINGS: 'happenings',
  PARTICIPANTS: 'participants',
  POSTS: 'posts',
  WHITELIST: 'whitelist',
  STANDS: 'stands',
  USERS: 'users',
  FEEDBACK: 'feedback',
} as const;
