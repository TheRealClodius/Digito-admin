import { defineFunction } from '@aws-amplify/backend';

/**
 * Define Auth Challenge Lambda Resource
 *
 * Orchestrates the custom auth flow for email OTP.
 * Determines which challenge to present based on session state.
 */
export const defineAuthChallenge = defineFunction({
  name: 'define-auth-challenge',
  entry: './handler.ts',
});
