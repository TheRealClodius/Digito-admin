import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const mockUpdateOne = vi.fn();

vi.mock('@/lib/mongodb-collections', () => ({
  getAdminUsersCollection: vi.fn(async () => ({
    updateOne: mockUpdateOne,
  })),
}));

function createRequest(body: Record<string, unknown>, secret?: string) {
  return new Request('http://localhost/api/webhooks/auth/user-created', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret && { 'x-webhook-secret': secret }),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/auth/user-created', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBHOOK_SECRET = 'test-secret';
  });

  it('returns 401 when webhook secret is missing', async () => {
    const res = await POST(createRequest({ cognitoSub: 'sub-123', email: 'test@example.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when cognitoSub is missing', async () => {
    const res = await POST(createRequest({ email: 'test@example.com' }, 'test-secret'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(createRequest({ cognitoSub: 'sub-123' }, 'test-secret'));
    expect(res.status).toBe(400);
  });

  it('updates user with cognitoSub when user exists', async () => {
    mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

    const res = await POST(
      createRequest(
        {
          cognitoSub: 'sub-123',
          email: 'Test@Example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        'test-secret'
      )
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { email: 'test@example.com' },
      {
        $set: expect.objectContaining({
          cognitoSub: 'sub-123',
          firstName: 'Test',
          lastName: 'User',
        }),
      }
    );
  });

  it('returns 404 when user not found', async () => {
    mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });

    const res = await POST(
      createRequest(
        { cognitoSub: 'sub-123', email: 'unknown@example.com' },
        'test-secret'
      )
    );
    expect(res.status).toBe(404);
  });
});
