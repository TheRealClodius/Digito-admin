import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole, requireEventAccess } from './api-auth';
import type { AdminUser } from '@/types/admin-user';
import { ObjectId } from 'mongodb';

const mockVerify = vi.fn();
const mockFindOne = vi.fn();

vi.mock('./cognito', () => ({
  verifyCognitoToken: (...args: unknown[]) => mockVerify(...args),
}));

vi.mock('./mongodb-collections', () => ({
  getAdminUsersCollection: vi.fn(async () => ({
    findOne: mockFindOne,
  })),
}));

function createRequest(token?: string) {
  return new Request('http://localhost/api/test', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

const mockAdminUser: AdminUser = {
  _id: new ObjectId(),
  cognitoSub: 'sub-123',
  email: 'admin@example.com',
  role: 'superadmin',
  clientIds: null,
  eventCodes: null,
  firstName: 'Admin',
  lastName: 'User',
  isActive: true,
  language: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  updatedBy: 'system',
};

describe('api-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('returns 401 when no auth header', async () => {
      const result = await requireAuth(createRequest());
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Invalid token'));

      const result = await requireAuth(createRequest('bad-token'));
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(401);
    });

    it('returns 403 when user not found in MongoDB', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'unknown-sub', username: 'unknown@example.com' });
      mockFindOne.mockResolvedValue(null);

      const result = await requireAuth(createRequest('valid-token'));
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('returns 403 when user is deactivated', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce({ ...mockAdminUser, isActive: false });

      const result = await requireAuth(createRequest('valid-token'));
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('returns VerifiedCaller for valid active user', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(mockAdminUser);

      const result = await requireAuth(createRequest('valid-token'));
      expect(result).not.toBeInstanceOf(Response);
      expect(result).toMatchObject({
        sub: 'sub-123',
        email: 'admin@example.com',
        role: 'superadmin',
        isSuperAdmin: true,
      });
    });

    it('falls back to email lookup when cognitoSub not found', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'new-sub', username: 'admin@example.com' });
      mockFindOne
        .mockResolvedValueOnce(null) // cognitoSub lookup fails
        .mockResolvedValueOnce(mockAdminUser); // email lookup succeeds

      const result = await requireAuth(createRequest('valid-token'));
      expect(result).not.toBeInstanceOf(Response);
      expect(mockFindOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('requireRole', () => {
    it('returns 403 when role does not match', async () => {
      const eventAdmin = { ...mockAdminUser, role: 'eventAdmin' as const };
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(eventAdmin);

      const result = await requireRole(createRequest('valid-token'), ['superadmin']);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('returns caller when role matches', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(mockAdminUser);

      const result = await requireRole(createRequest('valid-token'), ['superadmin']);
      expect(result).not.toBeInstanceOf(Response);
    });
  });

  describe('requireEventAccess', () => {
    it('allows superadmin access to any event', async () => {
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(mockAdminUser);

      const result = await requireEventAccess(createRequest('valid-token'), '2025089');
      expect(result).not.toBeInstanceOf(Response);
    });

    it('allows eventAdmin with matching eventCode', async () => {
      const eventAdmin = {
        ...mockAdminUser,
        role: 'eventAdmin' as const,
        eventCodes: ['2025089', '2025090'],
      };
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(eventAdmin);

      const result = await requireEventAccess(createRequest('valid-token'), '2025089');
      expect(result).not.toBeInstanceOf(Response);
    });

    it('denies eventAdmin without matching eventCode', async () => {
      const eventAdmin = {
        ...mockAdminUser,
        role: 'eventAdmin' as const,
        eventCodes: ['2025090'],
      };
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(eventAdmin);

      const result = await requireEventAccess(createRequest('valid-token'), '2025089');
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(403);
    });

    it('allows clientAdmin with null eventCodes (full access)', async () => {
      const clientAdmin = {
        ...mockAdminUser,
        role: 'clientAdmin' as const,
        eventCodes: null,
      };
      mockVerify.mockResolvedValueOnce({ sub: 'sub-123', username: 'admin@example.com' });
      mockFindOne.mockResolvedValueOnce(clientAdmin);

      const result = await requireEventAccess(createRequest('valid-token'), '2025089');
      expect(result).not.toBeInstanceOf(Response);
    });
  });
});
