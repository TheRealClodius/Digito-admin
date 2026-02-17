import { defineAuth, secret } from '@aws-amplify/backend';
import { preSignUp } from './pre-signup/resource.ts';
import { postConfirmation } from './post-confirmation/resource.ts';
import { defineAuthChallenge } from './define-auth-challenge/resource.ts';
import { createAuthChallenge } from './create-auth-challenge/resource.ts';
import { verifyAuthChallengeResponse } from './verify-auth-challenge-response/resource.ts';

/**
 * Cognito User Pool for the Goodgest Admin Dashboard.
 *
 * Supports:
 * - Email/Password (traditional)
 * - Google OAuth (SSO)
 * - Email OTP (passwordless, via custom auth challenge + SES)
 *
 * Google OAuth credentials must be configured as secrets:
 *   npx ampx sandbox secret set GOOGLE_CLIENT_ID
 *   npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Verifica il tuo account Goodgest',
      verificationEmailBody: (createCode) =>
        `Il tuo codice di verifica è: ${createCode()}`,
    },
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          fullname: 'name',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth/callback',
        'http://localhost:3000',
        'http://localhost:3000/login',
        // Tailscale dev
        'https://macbook-pro-di-simone.taila9277d.ts.net/auth/callback',
        'https://macbook-pro-di-simone.taila9277d.ts.net',
        'https://macbook-pro-di-simone.taila9277d.ts.net/login',
        // Production URLs (update when domain is ready)
        // 'https://admin.goodgest.com/auth/callback',
        // 'https://admin.goodgest.com',
        // 'https://admin.goodgest.com/login',
      ],
      logoutUrls: [
        'http://localhost:3000/login',
        'https://macbook-pro-di-simone.taila9277d.ts.net/login',
        // 'https://admin.goodgest.com/login',
      ],
    },
  },
  triggers: {
    preSignUp,
    postConfirmation,
    defineAuthChallenge,
    createAuthChallenge,
    verifyAuthChallengeResponse,
  },
});
