import { defineFunction } from '@aws-amplify/backend';

/**
 * Post-Confirmation Lambda Trigger
 *
 * Called AFTER a user confirms their email in Cognito.
 * Syncs the Cognito sub to the MongoDB adminUsers document.
 * Non-blocking: signup succeeds even if the webhook fails.
 */
export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  environment: {
    API_URL: process.env.POST_CONFIRMATION_API_URL || '',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
  },
});
