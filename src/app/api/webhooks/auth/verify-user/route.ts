import { NextResponse } from 'next/server';
import { getAdminUsersCollection } from '@/lib/mongodb-collections';

/**
 * POST /api/webhooks/auth/verify-user
 *
 * Called by the Cognito pre-signup Lambda trigger to check if a user
 * is pre-approved for registration. Looks up the email in MongoDB
 * adminUsers collection.
 */
export async function POST(request: Request) {
  const webhookSecret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { approved: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const collection = await getAdminUsersCollection();
    const adminUser = await collection.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!adminUser) {
      return NextResponse.json({
        approved: false,
        message: 'Account non autorizzato. Contatta l\'amministratore per richiedere l\'accesso.',
      });
    }

    return NextResponse.json({ approved: true });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json(
      { approved: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
