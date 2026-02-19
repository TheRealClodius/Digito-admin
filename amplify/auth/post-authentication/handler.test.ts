import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PostAuthenticationTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createEvent(overrides: Record<string, string> = {}): PostAuthenticationTriggerEvent {
  return {
    version: '1',
    region: 'eu-central-1',
    userPoolId: 'test-pool',
    userName: 'test-user',
    callerContext: {
      awsSdkVersion: '1',
      clientId: 'test-client',
    },
    triggerSource: 'PostAuthentication_Authentication',
    request: {
      userAttributes: {
        sub: 'cognito-sub-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        email_verified: 'true',
        ...overrides,
      },
      newDeviceUsed: false,
    },
    response: {},
  } as PostAuthenticationTriggerEvent;
}

describe('post-authentication handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_URL = 'https://admin.example.com/api/webhooks/auth/user-created';
    process.env.WEBHOOK_SECRET = 'test-secret';
  });

  it('calls webhook with user data on login', async () => {
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

  it('works for Google OAuth users (external provider)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '{}' });

    const event = createEvent({
      sub: 'google_sub_456',
      email: 'google.user@gmail.com',
      given_name: 'Google',
      family_name: 'User',
    });
    const result = await handler(event, {} as any, () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          cognitoSub: 'google_sub_456',
          email: 'google.user@gmail.com',
          firstName: 'Google',
          lastName: 'User',
        }),
      })
    );
    expect(result).toEqual(event);
  });
});
