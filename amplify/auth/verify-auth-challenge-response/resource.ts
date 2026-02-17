import { defineFunction } from '@aws-amplify/backend';

/**
 * Verify Auth Challenge Response Lambda Resource
 *
 * Verifies if the user's OTP code matches the expected code.
 */
export const verifyAuthChallengeResponse = defineFunction({
  name: 'verify-auth-challenge-response',
  entry: './handler.ts',
});
