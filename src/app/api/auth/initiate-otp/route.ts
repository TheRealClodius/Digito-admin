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
import { getAdminUsersCollection } from '@/lib/mongodb-collections';
import { createRateLimiter } from '@/lib/rate-limit';

// 5 requests per minute per IP — protects against brute-force email enumeration
const otpRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

/**
 * POST /api/auth/initiate-otp
 *
 * Ensures a native Cognito user exists for the given email so the
 * CUSTOM_AUTH (OTP) flow can proceed. Federated-only users (Google)
 * don't have a native record, so we create one on-the-fly.
 *
 * SECURITY: The email MUST be pre-registered in MongoDB adminUsers
 * (isActive: true) before any Cognito operation is performed.
 * Users are always pre-registered by an operator.
 *
 * Rate-limited to 5 requests per minute per IP.
 *
 * Body: { email: string }
 * Returns: { ok: true } or { error: string }
 */
export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const rateResult = otpRateLimiter.check(ip);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra qualche minuto.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.retryAfterMs || 60_000) / 1000)) } }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // SECURITY CHECK: Verify user is pre-registered in MongoDB before touching Cognito
    const collection = await getAdminUsersCollection();
    const adminUser = await collection.findOne({
      email: normalizedEmail,
      isActive: true,
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Account non autorizzato. Contatta l\'amministratore per richiedere l\'accesso.' },
        { status: 403 }
      );
    }

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
        MessageAction: 'SUPPRESS',
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

    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
