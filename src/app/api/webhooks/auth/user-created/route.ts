import { NextResponse } from 'next/server';
import { getAdminUsersCollection } from '@/lib/mongodb-collections';

/**
 * POST /api/webhooks/auth/user-created
 *
 * Called by the Cognito post-confirmation Lambda trigger to sync
 * the Cognito sub to the MongoDB adminUsers document.
 * Links the Cognito identity to the pre-existing admin user by email.
 */
export async function POST(request: Request) {
  const webhookSecret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cognitoSub, email, firstName, lastName } = body;

    if (!cognitoSub || !email) {
      return NextResponse.json(
        { error: 'cognitoSub and email are required' },
        { status: 400 }
      );
    }

    const collection = await getAdminUsersCollection();
    const result = await collection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          cognitoSub,
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      console.warn(`Post-confirmation: no adminUser found for email ${email}`);
      return NextResponse.json(
        { error: 'User not found in admin database' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
