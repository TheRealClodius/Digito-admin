import { NextRequest, NextResponse } from 'next/server';
import {
  getCognitoAdminClient,
  getUserPoolId,
  generateTemporaryPassword,
} from '@/lib/cognito-admin';
import {
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * POST /api/auth/initiate-otp
 *
 * Ensures a native Cognito user exists for the given email so the
 * CUSTOM_AUTH (OTP) flow can proceed. Federated-only users (Google)
 * don't have a native record, so we create one on-the-fly.
 *
 * Body: { email: string }
 * Returns: { ok: true } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const client = getCognitoAdminClient();
    const userPoolId = getUserPoolId();

    // Check if a native user (not federated) already exists with this email
    const listResponse = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${normalizedEmail}"`,
      })
    );

    const nativeUser = listResponse.Users?.find(
      (u) => !u.Username?.startsWith('Google_') && !u.Username?.startsWith('google_')
    );

    if (nativeUser) {
      // Native user exists — OTP flow can proceed
      return NextResponse.json({ ok: true });
    }

    // No native user — create one with a random permanent password
    // (the user will never use the password, only OTP)
    const tempPassword = generateTemporaryPassword(24);

    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: normalizedEmail,
        UserAttributes: [
          { Name: 'email', Value: normalizedEmail },
          { Name: 'email_verified', Value: 'true' },
        ],
        TemporaryPassword: tempPassword,
        MessageAction: 'SUPPRESS', // Don't send welcome email
      })
    );

    // Set a permanent password to move user from FORCE_CHANGE_PASSWORD → CONFIRMED
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: normalizedEmail,
        Password: generateTemporaryPassword(32),
        Permanent: true,
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Errore interno';
    console.error('[initiate-otp] Error:', message);

    if (error instanceof Error && error.name === 'UsernameExistsException') {
      // User already exists (race condition) — proceed
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
