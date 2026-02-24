import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    expect(limiter.check('key1')).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.check('key1')).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.check('key1')).toEqual({ allowed: true, remaining: 0 });
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check('key1');
    limiter.check('key1');
    const result = limiter.check('key1');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    expect(limiter.check('b').allowed).toBe(true);
  });

  it('resets after the window expires', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.check('key1');
    expect(limiter.check('key1').allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check('key1').allowed).toBe(true);
  });

  it('cleans up expired entries', () => {
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 1 });

    limiter.check('key1');
    limiter.check('key2');

    vi.advanceTimersByTime(11_000);

    // After window expires, new requests should be allowed
    expect(limiter.check('key1').allowed).toBe(true);
    expect(limiter.check('key2').allowed).toBe(true);
  });
});
