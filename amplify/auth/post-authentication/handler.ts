import type { PostAuthenticationTriggerHandler } from 'aws-lambda';

/**
 * Post-Authentication Lambda Handler
 *
 * Syncs Cognito user data to MongoDB via webhook on every successful login.
 * This covers Google OAuth users who bypass PostConfirmation (which only fires
 * for email/password signups, not for external providers).
 *
 * Non-blocking: returns event even if webhook fails.
 */
export const handler: PostAuthenticationTriggerHandler = async (event) => {
  console.log(`PostAuthentication trigger for ${event.request.userAttributes.email}`);

  const { sub, email, given_name, family_name } = event.request.userAttributes;
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
