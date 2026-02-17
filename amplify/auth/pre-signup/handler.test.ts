import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PreSignUpTriggerEvent } from 'aws-lambda';
import { handler } from './handler';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createEvent(overrides: Partial<PreSignUpTriggerEvent> = {}): PreSignUpTriggerEvent {
  return {
    version: '1',
    region: 'eu-central-1',
    userPoolId: 'test-pool',
    userName: 'test-user',
    callerContext: {
      awsSdkVersion: '1',
      clientId: 'test-client',
    },
    triggerSource: 'PreSignUp_ExternalProvider',
    request: {
      userAttributes: {
        email: 'test@example.com',
      },
      validationData: {},
    },
    response: {
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
    },
    ...overrides,
  } as PreSignUpTriggerEvent;
}

describe('pre-signup handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_URL = 'https://admin.example.com/api/webhooks/auth/verify-user';
    process.env.WEBHOOK_SECRET = 'test-secret';
  });

  it('allows admin-created users without calling webhook', async () => {
    const event = createEvent({ triggerSource: 'PreSignUp_AdminCreateUser' });
    const result = await handler(event, {} as any, () => {});
    expect(result).toEqual(event);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls webhook and allows pre-approved users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ approved: true }),
    });

    const event = createEvent();
    const result = await handler(event, {} as any, () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      'https://admin.example.com/api/webhooks/auth/verify-user',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'test-secret',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          triggerSource: 'PreSignUp_ExternalProvider',
        }),
      })
    );
    expect(result!.response.autoConfirmUser).toBe(true);
    expect(result!.response.autoVerifyEmail).toBe(true);
  });

  it('blocks non-approved users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ approved: false }),
    });

    const event = createEvent();
    await expect(handler(event, {} as any, () => {})).rejects.toThrow(
      'Account non autorizzato'
    );
  });

  it('blocks when webhook returns non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ approved: false, message: 'Account non autorizzato. Contatta l\'amministratore per richiedere l\'accesso.' }),
    });

    const event = createEvent();
    await expect(handler(event, {} as any, () => {})).rejects.toThrow(
      'Account non autorizzato'
    );
  });

  it('throws when API_URL is not configured', async () => {
    delete process.env.API_URL;

    const event = createEvent();
    await expect(handler(event, {} as any, () => {})).rejects.toThrow(
      'Configurazione del sistema non valida'
    );
  });

  it('throws when email is missing', async () => {
    const event = createEvent();
    event.request.userAttributes.email = '';

    await expect(handler(event, {} as any, () => {})).rejects.toThrow(
      'Email non fornita'
    );
  });

  it('does not auto-confirm for normal signups', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ approved: true }),
    });

    const event = createEvent({ triggerSource: 'PreSignUp_SignUp' });
    const result = await handler(event, {} as any, () => {});
    expect(result!.response.autoConfirmUser).toBe(false);
    expect(result!.response.autoVerifyEmail).toBe(false);
  });
});
