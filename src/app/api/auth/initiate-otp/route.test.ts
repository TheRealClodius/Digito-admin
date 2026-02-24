import { describe, it, expect, vi, beforeEach } from 'vitest';

// === Hoisted mocks (available before vi.mock hoisting) ===
const { mockCheck, mockFindOne, mockSend } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockFindOne: vi.fn(),
  mockSend: vi.fn(),
}));

// === Rate limit mock ===
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({ check: mockCheck })),
}));

// === MongoDB mock ===
vi.mock('@/lib/mongodb-collections', () => ({
  getAdminUsersCollection: async () => ({
    findOne: mockFindOne,
  }),
}));

// === Cognito Admin mock ===
vi.mock('@/lib/cognito-admin', () => ({
  getCognitoAdminClient: vi.fn(() => ({ send: mockSend })),
  getUserPoolId: vi.fn(() => 'eu-south-1_testpool'),
  generateTemporaryPassword: vi.fn(() => 'TempPass1!SecureRandom'),
}));

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  ListUsersCommand: vi.fn(function (this: unknown, input: unknown) {
    Object.assign(this as object, input);
  }),
  AdminCreateUserCommand: vi.fn(function (this: unknown, input: unknown) {
    Object.assign(this as object, input);
  }),
  AdminSetUserPasswordCommand: vi.fn(function (this: unknown, input: unknown) {
    Object.assign(this as object, input);
  }),
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/initiate-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/initiate-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockResolvedValue(null);
    mockSend.mockResolvedValue({ Users: [] });
    // Default: rate limit allows requests
    mockCheck.mockReturnValue({ allowed: true, remaining: 4 });
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(createRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when email is not pre-registered in MongoDB', async () => {
    mockFindOne.mockResolvedValue(null);

    const res = await POST(createRequest({ email: 'unknown@example.com' }));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toContain('non autorizzato');

    // Must NOT call Cognito at all
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 403 when user exists in MongoDB but is inactive (filtered by query)', async () => {
    // MongoDB findOne({ email, isActive: true }) returns null for inactive users
    mockFindOne.mockResolvedValue(null);

    const res = await POST(createRequest({ email: 'inactive@example.com' }));
    expect(res.status).toBe(403);

    // Verify the query includes isActive: true
    expect(mockFindOne).toHaveBeenCalledWith({
      email: 'inactive@example.com',
      isActive: true,
    });

    // Must NOT call Cognito
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns ok when user is pre-registered and native Cognito user already exists', async () => {
    mockFindOne.mockResolvedValue({
      email: 'admin@example.com',
      isActive: true,
      role: 'superadmin',
    });

    // Native user already exists in Cognito
    mockSend.mockResolvedValueOnce({
      Users: [
        { Username: 'admin@example.com', Enabled: true, UserStatus: 'CONFIRMED' },
      ],
    });

    const res = await POST(createRequest({ email: 'admin@example.com' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    // Should only call ListUsersCommand (1 call), not create
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('creates native Cognito user when pre-registered but no native user exists', async () => {
    mockFindOne.mockResolvedValue({
      email: 'google-only@example.com',
      isActive: true,
      role: 'clientAdmin',
    });

    // Only federated Google user exists, no native user
    mockSend
      .mockResolvedValueOnce({
        Users: [
          { Username: 'Google_12345', Enabled: true, UserStatus: 'EXTERNAL_PROVIDER' },
        ],
      })
      .mockResolvedValueOnce({}) // AdminCreateUserCommand
      .mockResolvedValueOnce({}); // AdminSetUserPasswordCommand

    const res = await POST(createRequest({ email: 'google-only@example.com' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    // ListUsers + AdminCreateUser + AdminSetUserPassword = 3 calls
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('normalizes email to lowercase before MongoDB check', async () => {
    mockFindOne.mockResolvedValue({
      email: 'admin@example.com',
      isActive: true,
      role: 'superadmin',
    });

    mockSend.mockResolvedValueOnce({
      Users: [{ Username: 'admin@example.com' }],
    });

    await POST(createRequest({ email: 'Admin@Example.COM' }));

    expect(mockFindOne).toHaveBeenCalledWith({
      email: 'admin@example.com',
      isActive: true,
    });
  });

  it('handles Cognito UsernameExistsException gracefully', async () => {
    mockFindOne.mockResolvedValue({
      email: 'race@example.com',
      isActive: true,
      role: 'eventAdmin',
    });

    // No native user found
    mockSend.mockResolvedValueOnce({ Users: [] });

    // AdminCreateUser throws UsernameExistsException (race condition)
    const usernameExistsError = new Error('User already exists');
    usernameExistsError.name = 'UsernameExistsException';
    mockSend.mockRejectedValueOnce(usernameExistsError);

    const res = await POST(createRequest({ email: 'race@example.com' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 500 for unexpected Cognito errors', async () => {
    mockFindOne.mockResolvedValue({
      email: 'admin@example.com',
      isActive: true,
      role: 'superadmin',
    });

    // No native user
    mockSend.mockResolvedValueOnce({ Users: [] });

    // AdminCreateUser throws unexpected error
    mockSend.mockRejectedValueOnce(new Error('ServiceUnavailable'));

    const res = await POST(createRequest({ email: 'admin@example.com' }));
    expect(res.status).toBe(500);
  });

  it('does not leak internal error messages in 500 response', async () => {
    mockFindOne.mockResolvedValue({
      email: 'admin@example.com',
      isActive: true,
      role: 'superadmin',
    });

    mockSend.mockResolvedValueOnce({ Users: [] });
    mockSend.mockRejectedValueOnce(new Error('Sensitive internal details'));

    const res = await POST(createRequest({ email: 'admin@example.com' }));
    const body = await res.json();
    expect(body.error).toBe('Errore interno');
    expect(body.error).not.toContain('Sensitive');
  });

  it('returns 429 when rate limited', async () => {
    mockCheck.mockReturnValue({ allowed: false, remaining: 0, retryAfterMs: 45_000 });

    const res = await POST(createRequest({ email: 'admin@example.com' }));
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.error).toContain('Troppe richieste');
    expect(res.headers.get('Retry-After')).toBe('45');

    // Should NOT touch MongoDB or Cognito
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
