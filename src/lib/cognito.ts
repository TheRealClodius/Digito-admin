import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';

// Cached verifier for serverless reuse
let accessTokenVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getCognitoConfig() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error(
      'Missing Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_USER_POOL_CLIENT_ID are required'
    );
  }

  return { userPoolId, clientId };
}

export function getAccessTokenVerifier() {
  if (!accessTokenVerifier) {
    const { userPoolId, clientId } = getCognitoConfig();
    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
  }
  return accessTokenVerifier;
}

/**
 * Verify a Cognito access token and return its payload.
 * Returns { sub, email/username } for identifying the caller.
 */
export async function verifyCognitoToken(
  token: string
): Promise<CognitoAccessTokenPayload> {
  const verifier = getAccessTokenVerifier();
  return verifier.verify(token) as Promise<CognitoAccessTokenPayload>;
}

/** Reset cached verifier (for testing) */
export function _resetVerifier() {
  accessTokenVerifier = null;
}
