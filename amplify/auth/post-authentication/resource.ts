import { defineFunction } from '@aws-amplify/backend';

/**
 * Post-Authentication Lambda Trigger
 *
 * Called AFTER every successful login, regardless of auth method.
 * Syncs the Cognito sub to the MongoDB adminUsers document.
 * This covers Google OAuth users who bypass PostConfirmation.
 * Non-blocking: login succeeds even if the webhook fails.
 */
export const postAuthentication = defineFunction({
  name: 'post-authentication',
  environment: {
    API_URL: process.env.POST_CONFIRMATION_API_URL || '',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
  },
});
