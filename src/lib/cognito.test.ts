import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyCognitoToken, _resetVerifier } from './cognito';

const mockVerify = vi.fn();

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: vi.fn(() => ({
      verify: mockVerify,
    })),
  },
}));

describe('cognito JWT verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetVerifier();
    process.env.COGNITO_USER_POOL_ID = 'eu-central-1_testPool';
    process.env.COGNITO_USER_POOL_CLIENT_ID = 'test-client-id';
  });

  it('verifies a valid token and returns payload', async () => {
    const payload = { sub: 'test-sub', username: 'test@example.com' };
    mockVerify.mockResolvedValueOnce(payload);

    const result = await verifyCognitoToken('valid-token');
    expect(result).toEqual(payload);
    expect(mockVerify).toHaveBeenCalledWith('valid-token');
  });

  it('throws for an invalid token', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Token expired'));

    await expect(verifyCognitoToken('expired-token')).rejects.toThrow(
      'Token expired'
    );
  });

  it('throws when config is missing', async () => {
    delete process.env.COGNITO_USER_POOL_ID;

    await expect(verifyCognitoToken('any-token')).rejects.toThrow(
      'Missing Cognito configuration'
    );
  });
});
