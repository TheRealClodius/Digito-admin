import { defineFunction } from '@aws-amplify/backend';

/**
 * Pre-Signup Lambda Trigger
 *
 * Called BEFORE a new user is created in Cognito.
 * Verifies that the user's email exists in MongoDB adminUsers and is active.
 * Blocks unauthorized signups (e.g. Google OAuth for non-pre-approved users).
 * Admin-created users (via AdminCreateUser) bypass this check.
 */
export const preSignUp = defineFunction({
  name: 'pre-signup',
  environment: {
    API_URL: process.env.PRE_SIGNUP_API_URL || '',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
  },
});
