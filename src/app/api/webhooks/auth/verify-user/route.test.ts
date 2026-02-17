import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const mockFindOne = vi.fn();

vi.mock('@/lib/mongodb-collections', () => ({
  getAdminUsersCollection: vi.fn(async () => ({
    findOne: mockFindOne,
  })),
}));

function createRequest(body: Record<string, unknown>, secret?: string) {
  return new Request('http://localhost/api/webhooks/auth/verify-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret && { 'x-webhook-secret': secret }),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/auth/verify-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBHOOK_SECRET = 'test-secret';
  });

  it('returns 401 when webhook secret is missing', async () => {
    const res = await POST(createRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when webhook secret is wrong', async () => {
    const res = await POST(createRequest({ email: 'test@example.com' }, 'wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(createRequest({}, 'test-secret'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.approved).toBe(false);
  });

  it('returns approved: true when user exists and is active', async () => {
    mockFindOne.mockResolvedValueOnce({
      _id: 'test-id',
      email: 'test@example.com',
      isActive: true,
      role: 'superadmin',
    });

    const res = await POST(createRequest({ email: 'Test@Example.com' }, 'test-secret'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.approved).toBe(true);
    expect(mockFindOne).toHaveBeenCalledWith({
      email: 'test@example.com',
      isActive: true,
    });
  });

  it('returns approved: false when user not found', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const res = await POST(createRequest({ email: 'unknown@example.com' }, 'test-secret'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.approved).toBe(false);
  });
});
