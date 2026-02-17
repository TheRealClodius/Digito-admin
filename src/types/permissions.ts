/**
 * User role types for authorization
 *
 * - superadmin: Full access to all clients and events
 * - clientAdmin: Scoped access to specific clients and all their events
 * - eventAdmin: Scoped access to specific events within assigned clients
 */
export type UserRole = 'superadmin' | 'clientAdmin' | 'eventAdmin';

/**
 * User permissions document stored in MongoDB
 * Collection: adminUsers (in goodgest-admin database)
 *
 * @example Superadmin (full access)
 * {
 *   userId: "abc123",
 *   cognitoSub: "cognito-uuid-xxx",
 *   email: "andrei.clodius@goodgest.com",
 *   role: "superadmin",
 *   clientIds: null,     // null = full access
 *   eventCodes: null,    // null = full access
 *   createdAt: Date,
 *   updatedAt: Date,
 *   createdBy: "cognito-uuid-xxx",
 *   updatedBy: "cognito-uuid-xxx"
 * }
 *
 * @example Client Admin (scoped access)
 * {
 *   userId: "def456",
 *   cognitoSub: "cognito-uuid-yyy",
 *   email: "client-admin@example.com",
 *   role: "clientAdmin",
 *   clientIds: ["client-1", "client-2"],  // Specific clients
 *   eventCodes: null,                      // All events in allowed clients
 *   createdAt: Date,
 *   updatedAt: Date,
 *   createdBy: "cognito-uuid-xxx",
 *   updatedBy: "cognito-uuid-xxx"
 * }
 */
export interface UserPermissions {
  /** User ID (for backward compatibility, will be removed in future) */
  userId: string;

  /** Cognito user identifier (immutable) - primary auth link (optional during Phase 0) */
  cognitoSub?: string;

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
   * List of event codes (MongoDB database names) this user can access
   * - null = full access (for superadmins and clientAdmins within their clients)
   * - [] = no access
   * - ['2025089', '2026003'] = scoped access to specific events
   */
  eventCodes?: string[] | null;

  /** Cognito sub of user who created this permission */
  createdBy: string;

  /** Cognito sub of user who last updated this permission */
  updatedBy: string;
}
