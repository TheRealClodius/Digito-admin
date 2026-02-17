import { defineFunction } from '@aws-amplify/backend';

/**
 * Create Auth Challenge Lambda Resource
 *
 * Generates a 6-digit OTP code and sends it via SES email.
 * The SES sender domain must be verified in AWS SES.
 */
export const createAuthChallenge = defineFunction({
  name: 'create-auth-challenge',
  entry: './handler.ts',
  environment: {
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'noreply@simonemarra.it',
  },
});
