import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock aws-amplify/auth
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from 'aws-amplify/auth';
import { apiFetch, ApiError } from './api-client';

const mockFetchAuthSession = vi.mocked(fetchAuthSession);

describe('api-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetchAuthSession.mockResolvedValue({
      tokens: { accessToken: { toString: () => 'mock-token-123' } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    global.fetch = vi.fn();
  });

  it('sends GET request with auth header', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([{ id: '1', name: 'Test' }]), { status: 200 })
    );

    const result = await apiFetch<{ id: string; name: string }[]>('/api/clients');

    expect(global.fetch).toHaveBeenCalledWith('/api/clients', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock-token-123',
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual([{ id: '1', name: 'Test' }]);
  });

  it('sends POST request with body', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ id: '2', name: 'New' }), { status: 201 })
    );

    const result = await apiFetch('/api/clients', {
      method: 'POST',
      body: { name: 'New' },
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/clients', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock-token-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New' }),
    });
    expect(result).toEqual({ id: '2', name: 'New' });
  });

  it('throws ApiError on non-OK response with JSON error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    );

    try {
      await apiFetch('/api/clients/999');
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).message).toBe('Not found');
    }
  });

  it('throws ApiError with generic message if body is not JSON', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    );

    try {
      await apiFetch('/api/test');
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(500);
    }
  });

  it('throws if no auth session available', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as any);

    await expect(apiFetch('/api/clients')).rejects.toThrow('Not authenticated');
  });

  it('handles 204 No Content responses', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, { status: 204 })
    );

    const result = await apiFetch('/api/clients/1', { method: 'DELETE' });
    expect(result).toBeNull();
  });
});
