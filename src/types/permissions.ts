/**
 * User role types for authorization
 *
 * - superadmin: Full access to all clients and events
 * - client-admin: Scoped access to specific clients
 * - event-admin: Scoped access to specific events
 */
export type UserRole = 'superadmin' | 'client-admin' | 'event-admin';

/**
 * User permissions document stored in Firestore
 * Collection: userPermissions/{userId}
 *
 * @example Superadmin (full access)
 * {
 *   userId: "abc123",
 *   email: "andrei.clodius@goodgest.com",
 *   role: "superadmin",
 *   clientIds: null,  // null = full access
 *   eventIds: null,   // null = full access
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp,
 *   createdBy: "abc123",
 *   updatedBy: "abc123"
 * }
 *
 * @example Client Admin (scoped access)
 * {
 *   userId: "def456",
 *   email: "client-admin@example.com",
 *   role: "client-admin",
 *   clientIds: ["client-1", "client-2"],  // Specific clients
 *   eventIds: null,                        // All events in allowed clients
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp,
 *   createdBy: "abc123",
 *   updatedBy: "abc123"
 * }
 */
export interface UserPermissions {
  /** Firebase Auth UID */
  userId: string;

  /** User email (for debugging and display) */
  email: string;

  /** User role determines access level */
  role: UserRole;

  /** When this permission was created */
  createdAt: Date;

  /** When this permission was last updated */
  updatedAt: Date;

  /**
   * List of client IDs this user can access
   * - null = full access (for superadmins)
   * - [] = no access
   * - ['client-1', 'client-2'] = scoped access
   */
  clientIds?: string[] | null;

  /**
   * List of event IDs this user can access
   * - null = full access (for superadmins)
   * - [] = no access
   * - ['event-1', 'event-2'] = scoped access
   */
  eventIds?: string[] | null;

  /** UID of user who created this permission */
  createdBy: string;

  /** UID of user who last updated this permission */
  updatedBy: string;
}
