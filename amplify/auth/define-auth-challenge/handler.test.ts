import { describe, it, expect } from 'vitest';
import type { DefineAuthChallengeTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

function makeEvent(
  sessionResults: Array<boolean | null> = []
): DefineAuthChallengeTriggerEvent {
  return {
    version: '1',
    triggerSource: 'DefineAuthChallenge_Authentication',
    region: 'eu-south-1',
    userPoolId: 'eu-south-1_test',
    userName: 'test@example.com',
    callerContext: { awsSdkVersion: 'test', clientId: 'test' },
    request: {
      userAttributes: { email: 'test@example.com' },
      session: sessionResults.map((result) => ({
        challengeName: 'CUSTOM_CHALLENGE',
        challengeResult: result ?? false,
        challengeMetadata: 'OTP_CODE',
      })),
    },
    response: {
      issueTokens: false,
      failAuthentication: false,
    },
  } as unknown as DefineAuthChallengeTriggerEvent;
}

describe('define-auth-challenge handler', () => {
  it('issues CUSTOM_CHALLENGE on first request (empty session)', async () => {
    const event = makeEvent([]);
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.issueTokens).toBe(false);
    expect(result?.response.failAuthentication).toBe(false);
    expect(result?.response.challengeName).toBe('CUSTOM_CHALLENGE');
  });

  it('issues tokens when last challenge was answered correctly', async () => {
    const event = makeEvent([true]);
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.issueTokens).toBe(true);
    expect(result?.response.failAuthentication).toBe(false);
  });

  it('retries CUSTOM_CHALLENGE after one wrong answer', async () => {
    const event = makeEvent([false]);
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.issueTokens).toBe(false);
    expect(result?.response.failAuthentication).toBe(false);
    expect(result?.response.challengeName).toBe('CUSTOM_CHALLENGE');
  });

  it('retries CUSTOM_CHALLENGE after two wrong answers', async () => {
    const event = makeEvent([false, false]);
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.issueTokens).toBe(false);
    expect(result?.response.failAuthentication).toBe(false);
    expect(result?.response.challengeName).toBe('CUSTOM_CHALLENGE');
  });

  it('fails authentication after three or more failed attempts', async () => {
    const event = makeEvent([false, false, false]);
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.issueTokens).toBe(false);
    expect(result?.response.failAuthentication).toBe(true);
  });

  it('issues tokens when correct answer arrives after previous wrong attempts', async () => {
    const event = makeEvent([false, true]);
    const result = await handler(event, {} as any, () => {});

    expect(result?.response.issueTokens).toBe(true);
    expect(result?.response.failAuthentication).toBe(false);
  });

  it('returns the event object', async () => {
    const event = makeEvent([]);
    const result = await handler(event, {} as any, () => {});

    expect(result).toBe(event);
  });
});
