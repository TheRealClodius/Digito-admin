import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createEvent(overrides: Record<string, string> = {}): PostConfirmationTriggerEvent {
  return {
    version: '1',
    region: 'eu-central-1',
    userPoolId: 'test-pool',
    userName: 'test-user',
    callerContext: {
      awsSdkVersion: '1',
      clientId: 'test-client',
    },
    triggerSource: 'PostConfirmation_ConfirmSignUp',
    request: {
      userAttributes: {
        sub: 'cognito-sub-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        email_verified: 'true',
        ...overrides,
      },
    },
    response: {},
  } as PostConfirmationTriggerEvent;
}

describe('post-confirmation handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_URL = 'https://admin.example.com/api/webhooks/auth/user-created';
    process.env.WEBHOOK_SECRET = 'test-secret';
  });

  it('calls webhook with user data', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '{}' });

    const event = createEvent();
    const result = await handler(event, {} as any, () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      'https://admin.example.com/api/webhooks/auth/user-created',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'test-secret',
        },
        body: JSON.stringify({
          cognitoSub: 'cognito-sub-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          emailVerified: true,
        }),
      })
    );
    expect(result).toEqual(event);
  });

  it('returns event even when API_URL is not configured', async () => {
    delete process.env.API_URL;

    const event = createEvent();
    const result = await handler(event, {} as any, () => {});
    expect(result).toEqual(event);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns event even when webhook fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Internal Server Error',
    });

    const event = createEvent();
    const result = await handler(event, {} as any, () => {});
    expect(result).toEqual(event);
  });

  it('returns event even when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const event = createEvent();
    const result = await handler(event, {} as any, () => {});
    expect(result).toEqual(event);
  });
});
