import type { DefineAuthChallengeTriggerHandler } from 'aws-lambda';

/**
 * Define Auth Challenge Lambda Handler
 *
 * OTP flow:
 * 1. First request (no session) → issue CUSTOM_CHALLENGE (triggers OTP send)
 * 2. Correct answer → issue tokens
 * 3. Wrong answer, attempts < 3 → retry CUSTOM_CHALLENGE
 * 4. 3+ failed attempts → fail authentication
 */
export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const { request, response } = event;

  if (request.session.length === 0) {
    // First request: issue challenge
    response.issueTokens = false;
    response.failAuthentication = false;
    response.challengeName = 'CUSTOM_CHALLENGE';
  } else if (
    request.session[request.session.length - 1].challengeResult === true
  ) {
    // Correct answer: issue tokens
    response.issueTokens = true;
    response.failAuthentication = false;
  } else if (request.session.length >= 3) {
    // Too many failed attempts
    response.issueTokens = false;
    response.failAuthentication = true;
  } else {
    // Wrong answer, allow retry
    response.issueTokens = false;
    response.failAuthentication = false;
    response.challengeName = 'CUSTOM_CHALLENGE';
  }

  return event;
};
