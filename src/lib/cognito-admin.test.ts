import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCognitoUser,
  disableCognitoUser,
  enableCognitoUser,
  deleteCognitoUser,
  generateTemporaryPassword,
  _resetClient,
} from './cognito-admin';

const mockSend = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  class MockClient { send = mockSend; }
  class MockCommand { constructor(public input: unknown) {} }
  return {
    CognitoIdentityProviderClient: MockClient,
    AdminCreateUserCommand: MockCommand,
    AdminSetUserPasswordCommand: MockCommand,
    AdminUpdateUserAttributesCommand: MockCommand,
    AdminDeleteUserCommand: MockCommand,
    AdminDisableUserCommand: MockCommand,
    AdminEnableUserCommand: MockCommand,
    ListUsersCommand: MockCommand,
  };
});

describe('cognito-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetClient();
    process.env.COGNITO_USER_POOL_ID = 'eu-central-1_testPool';
    process.env.COGNITO_REGION = 'eu-central-1';
  });

  describe('generateTemporaryPassword', () => {
    it('generates a password of the specified length', () => {
      const password = generateTemporaryPassword(20);
      expect(password).toHaveLength(20);
    });

    it('contains uppercase, lowercase, numbers, and special chars', () => {
      const password = generateTemporaryPassword(16);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*]/);
    });
  });

  describe('createCognitoUser', () => {
    it('creates a user and returns cognitoSub', async () => {
      mockSend.mockResolvedValueOnce({
        User: {
          Username: 'test@example.com',
          Attributes: [{ Name: 'sub', Value: 'sub-123' }],
        },
      });

      const result = await createCognitoUser({
        email: 'Test@Example.com',
        temporaryPassword: 'TempPass1!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.cognitoSub).toBe('sub-123');
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({
        Username: 'test@example.com',
        MessageAction: 'SUPPRESS',
      });
    });

    it('throws when sub is missing from response', async () => {
      mockSend.mockResolvedValueOnce({ User: { Attributes: [] } });

      await expect(
        createCognitoUser({ email: 'test@example.com', temporaryPassword: 'x' })
      ).rejects.toThrow('Failed to get Cognito sub');
    });
  });

  describe('disableCognitoUser', () => {
    it('sends command with lowercase email', async () => {
      mockSend.mockResolvedValueOnce({});

      await disableCognitoUser('Test@Example.com');
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({ Username: 'test@example.com' });
    });
  });

  describe('enableCognitoUser', () => {
    it('sends command with lowercase email', async () => {
      mockSend.mockResolvedValueOnce({});

      await enableCognitoUser('Test@Example.com');
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({ Username: 'test@example.com' });
    });
  });

  describe('deleteCognitoUser', () => {
    it('lists users and deletes all identities', async () => {
      mockSend
        .mockResolvedValueOnce({
          Users: [
            { Username: 'test@example.com' },
            { Username: 'Google_123' },
          ],
        })
        .mockResolvedValueOnce({}) // first delete
        .mockResolvedValueOnce({}); // second delete

      await deleteCognitoUser('test@example.com');
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('ignores UserNotFoundException', async () => {
      const error = new Error('User not found');
      error.name = 'UserNotFoundException';
      mockSend.mockRejectedValueOnce(error);

      await expect(deleteCognitoUser('gone@example.com')).resolves.toBeUndefined();
    });
  });
});
