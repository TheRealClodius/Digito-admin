import { NextResponse } from 'next/server';
import { verifyCognitoToken } from './cognito';
import { getAdminUsersCollection } from './mongodb-collections';
import type { AdminUser } from '@/types/admin-user';
import type { UserRole, UserPermissions } from '@/types/permissions';
import { canAccessClient, canAccessEvent } from './permission-utils';

/**
 * Verified caller information from a Cognito access token + MongoDB lookup.
 */
export interface VerifiedCaller {
  sub: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
  adminUser: AdminUser;
}

/**
 * Extract and verify the Bearer token from a request.
 * Returns the VerifiedCaller on success, or a NextResponse error on failure.
 */
export async function requireAuth(
  request: Request
): Promise<VerifiedCaller | NextResponse> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = await verifyCognitoToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const cognitoSub = payload.sub;
  const email =
    (payload as Record<string, unknown>).email as string | undefined ||
    payload.username;

  // Look up admin user in MongoDB by cognitoSub, fallback by email
  const adminUser = await findAdminUser(cognitoSub, email);

  if (!adminUser) {
    return NextResponse.json(
      { error: 'User not found or not authorized' },
      { status: 403 }
    );
  }

  if (!adminUser.isActive) {
    return NextResponse.json(
      { error: 'User account is deactivated' },
      { status: 403 }
    );
  }

  return {
    sub: cognitoSub,
    email: adminUser.email,
    role: adminUser.role,
    isSuperAdmin: adminUser.role === 'superadmin',
    adminUser,
  };
}

/**
 * Verify auth and check that the caller has one of the required roles.
 */
export async function requireRole(
  request: Request,
  roles: UserRole[]
): Promise<VerifiedCaller | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Verify auth and check that the caller has access to a specific event.
 */
export async function requireEventAccess(
  request: Request,
  eventCode: string
): Promise<VerifiedCaller | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  // Build a minimal UserPermissions object for the permission check
  const permissions: UserPermissions = {
    userId: result.sub,
    cognitoSub: result.sub,
    email: result.email,
    role: result.role,
    clientIds: result.adminUser.clientIds,
    eventCodes: result.adminUser.eventCodes,
    createdAt: result.adminUser.createdAt,
    updatedAt: result.adminUser.updatedAt,
    createdBy: result.adminUser.createdBy,
    updatedBy: result.adminUser.updatedBy,
  };

  // Superadmins have full access
  if (result.isSuperAdmin) return result;

  // For clientAdmin/eventAdmin: check eventCodes access
  if (permissions.eventCodes === null) {
    // null = all events (clientAdmin with full access)
    return result;
  }

  if (permissions.eventCodes && permissions.eventCodes.includes(eventCode)) {
    return result;
  }

  return NextResponse.json(
    { error: 'Access denied to this event' },
    { status: 403 }
  );
}

/**
 * Find an admin user in MongoDB by cognitoSub, fallback by email.
 */
async function findAdminUser(
  cognitoSub: string,
  email?: string
): Promise<AdminUser | null> {
  const collection = await getAdminUsersCollection();

  // Primary lookup: by cognitoSub
  let user = await collection.findOne({ cognitoSub });

  // Fallback: by email (handles first-login before cognitoSub is set)
  if (!user && email) {
    user = await collection.findOne({ email: email.toLowerCase() });
  }

  return user;
}
