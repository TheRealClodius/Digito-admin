import { NextResponse } from 'next/server';
import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { verifyCognitoToken } from './cognito';
import { getCognitoAdminClient, getUserPoolId } from './cognito-admin';
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
 * Resolved identity from a Cognito access token (sub + email).
 * This is the first step of authentication — token verification + email resolution.
 */
export interface ResolvedIdentity {
  sub: string;
  email?: string;
}

/**
 * Extract and verify the Bearer token from a request, resolving the caller's identity.
 * Returns the ResolvedIdentity on success, or a NextResponse error on failure.
 *
 * This is a lower-level function used by both `requireAuth` and `checkPermissions`.
 */
export async function resolveTokenIdentity(
  request: Request
): Promise<ResolvedIdentity | NextResponse> {
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

  const sub = payload.sub;
  let email: string | undefined;

  // Access tokens may have email as a custom claim, or username may be the email
  if (typeof (payload as Record<string, unknown>).email === 'string') {
    email = ((payload as Record<string, unknown>).email as string).toLowerCase();
  } else if (typeof payload.username === 'string' && payload.username.includes('@')) {
    email = payload.username.toLowerCase();
  } else if (typeof payload.username === 'string' && payload.username) {
    // Username is a UUID or federated identity (e.g. Google OAuth) — fetch email from Cognito
    try {
      const client = getCognitoAdminClient();
      const userData = await client.send(
        new AdminGetUserCommand({
          UserPoolId: getUserPoolId(),
          Username: payload.username,
        })
      );
      const emailAttr = userData.UserAttributes?.find((a) => a.Name === 'email');
      if (emailAttr?.Value) {
        email = emailAttr.Value.toLowerCase();
      }
    } catch {
      // Could not fetch email from Cognito — proceed without email fallback
    }
  }

  return { sub, email };
}

/**
 * Extract and verify the Bearer token from a request.
 * Returns the VerifiedCaller on success, or a NextResponse error on failure.
 */
export async function requireAuth(
  request: Request
): Promise<VerifiedCaller | NextResponse> {
  const identity = await resolveTokenIdentity(request);
  if (identity instanceof NextResponse) return identity;

  // Look up admin user in MongoDB by cognitoSub, fallback by email
  const adminUser = await findAdminUser(identity.sub, identity.email);

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
    sub: identity.sub,
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
export async function findAdminUser(
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
