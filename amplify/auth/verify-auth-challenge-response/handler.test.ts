import { describe, it, expect } from 'vitest';
import type { VerifyAuthChallengeResponseTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

function makeEvent(
  expectedAnswer: string | undefined,
  userAnswer: string
): VerifyAuthChallengeResponseTriggerEvent {
  return {
    version: '1',
    triggerSource: 'VerifyAuthChallengeResponse_Authentication',
    region: 'eu-south-1',
    userPoolId: 'eu-south-1_test',
    userName: 'test@example.com',
    callerContext: { awsSdkVersion: 'test', clientId: 'test' },
    request: {
      userAttributes: { email: 'test@example.com' },
      privateChallengeParameters: expectedAnswer !== undefined ? { answer: expectedAnswer } : {},
      challengeAnswer: userAnswer,
    },
    response: {
      answerCorrect: false,
    },
  } as unknown as VerifyAuthChallengeResponseTriggerEvent;
}

describe('verify-auth-challenge-response handler', () => {
  it('marks answerCorrect as true when user answer matches expected', async () => {
    const event = makeEvent('123456', '123456');
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.answerCorrect).toBe(true);
  });

  it('marks answerCorrect as false when user answer does not match', async () => {
    const event = makeEvent('123456', '999999');
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.answerCorrect).toBe(false);
  });

  it('trims whitespace before comparing (ignores accidental spaces)', async () => {
    const event = makeEvent('123456', '  123456  ');
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.answerCorrect).toBe(true);
  });

  it('trims whitespace on expected answer too', async () => {
    const event = makeEvent('  123456  ', '123456');
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.answerCorrect).toBe(true);
  });

  it('marks answerCorrect as false when expected answer is missing', async () => {
    const event = makeEvent(undefined, '123456');
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.answerCorrect).toBe(false);
  });

  it('returns the event object', async () => {
    const event = makeEvent('123456', '123456');
    const result = await handler(event, {} as any, () => {});

    expect(result).toBe(event);
  });
});
