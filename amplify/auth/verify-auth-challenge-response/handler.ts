import type { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';

/**
 * Verify Auth Challenge Response Lambda Handler
 *
 * Compares the user's OTP code answer with the expected code
 * stored in privateChallengeParameters.
 */
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expectedAnswer = event.request.privateChallengeParameters?.answer;
  const userAnswer = event.request.challengeAnswer;

  event.response.answerCorrect =
    expectedAnswer?.trim() === userAnswer?.trim();

  return event;
};
