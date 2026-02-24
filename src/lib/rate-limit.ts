/**
 * Simple in-memory sliding window rate limiter.
 *
 * Suitable for serverless environments where each instance maintains
 * its own state. For distributed rate limiting, consider using Redis.
 */

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per key per window */
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

interface WindowEntry {
  timestamps: number[];
}

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, WindowEntry>();

  function cleanup(now: number) {
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < config.windowMs
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();

    // Periodic cleanup (every 100 checks)
    if (Math.random() < 0.01) {
      cleanup(now);
    }

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < config.windowMs
    );

    if (entry.timestamps.length >= config.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = config.windowMs - (now - oldestInWindow);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    entry.timestamps.push(now);
    const remaining = config.maxRequests - entry.timestamps.length;
    return { allowed: true, remaining };
  }

  return { check };
}
