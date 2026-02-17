/**
 * MongoDB Connection Layer
 *
 * Singleton MongoClient with connection pooling for serverless environments.
 * Supports dynamic multi-database access for the Goodgest ecosystem:
 * - Master database (goodgest-admin) for admin users, clients, and mappings
 * - Event databases (identified by eventCode, e.g., "2025089", "2026003")
 *
 * Connection pooling configuration:
 * - maxPoolSize: 10 (max concurrent connections)
 * - minPoolSize: 1 (keep-alive connection)
 * - maxIdleTimeMS: 60000 (1 minute, suitable for serverless)
 */

import { Db, MongoClient } from 'mongodb';

// Validate environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('Missing required environment variable: MONGODB_URI');
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_ADMIN_DB_NAME = process.env.MONGODB_ADMIN_DB_NAME || 'goodgest-admin';

// Connection pool options optimized for serverless (Next.js)
const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60000,
};

// Module-level cache for singleton client (reused across serverless invocations)
let cachedClient: MongoClient | null = null;
let cachedClientPromise: Promise<MongoClient> | null = null;

/**
 * Get or create the MongoDB client singleton
 * Reuses connection across serverless function invocations
 */
async function getMongoClient(): Promise<MongoClient> {
  // Return cached client if available (MongoDB driver handles reconnection automatically)
  if (cachedClient) {
    return cachedClient;
  }

  // Return in-flight connection promise to avoid duplicate connections
  if (cachedClientPromise) {
    return cachedClientPromise;
  }

  // Create new connection
  cachedClientPromise = MongoClient.connect(MONGODB_URI, options).then((client) => {
    cachedClient = client;
    console.log('[MongoDB] Connected to cluster');
    return client;
  });

  return cachedClientPromise;
}

/**
 * Get the master admin database (goodgest-admin)
 * Used for: adminUsers, clients, clientEvents collections
 */
export async function getAdminDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(MONGODB_ADMIN_DB_NAME);
}

/**
 * Get a specific event database by event code
 * Each event has its own MongoDB database identified by eventCode
 *
 * @param eventCode - The event identifier (e.g., "2025089", "2026003")
 * @returns MongoDB database instance for the event
 *
 * @example
 * const eventDb = await getEventDb("2025089");
 * const participants = await eventDb.collection("participants").find().toArray();
 */
export async function getEventDb(eventCode: string): Promise<Db> {
  if (!eventCode || typeof eventCode !== 'string') {
    throw new Error('Invalid eventCode: must be a non-empty string');
  }

  const client = await getMongoClient();
  return client.db(eventCode);
}

/**
 * Close the MongoDB connection
 * Primarily for cleanup in test environments
 * In production serverless, connections are kept alive and reused
 */
export async function closeConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedClientPromise = null;
    console.log('[MongoDB] Connection closed');
  }
}
