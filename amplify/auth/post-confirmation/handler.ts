import type { PostConfirmationTriggerHandler } from 'aws-lambda';

/**
 * Post-Confirmation Lambda Handler
 *
 * Syncs Cognito user data to MongoDB via webhook.
 * Links the cognitoSub to the existing adminUsers document by email.
 *
 * Non-blocking: returns event even if webhook fails (avoids blocking
 * the user on a misconfigured webhook).
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log(`PostConfirmation trigger for ${event.request.userAttributes.email}`);

  const { sub, email, given_name, family_name, email_verified } = event.request.userAttributes;
  const apiUrl = process.env.API_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!apiUrl) {
    console.error('API_URL is not defined in environment variables');
    return event;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': webhookSecret || '',
      },
      body: JSON.stringify({
        cognitoSub: sub,
        email,
        firstName: given_name,
        lastName: family_name,
        emailVerified: email_verified === 'true',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook call failed: ${response.status} ${errorText}`);
    } else {
      console.log('User sync webhook successful');
    }
  } catch (error) {
    console.error('Error calling user sync webhook:', error);
  }

  return event;
};
