/**
 * Sliding-window rate limiter.
 *
 * Uses a sorted log of timestamps to provide a smoother rate-limiting curve
 * compared to fixed-window approaches. Old entries are pruned lazily.
 */

export type SlidingWindowRateLimiter = {
  consume: () => { allowed: boolean; retryAfterMs: number; remaining: number };
  reset: () => void;
  /** Current number of requests tracked in the window. */
  count: () => number;
};

export function createSlidingWindowRateLimiter(params: {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
}): SlidingWindowRateLimiter {
  const maxRequests = Math.max(1, Math.floor(params.maxRequests));
  const windowMs = Math.max(1, Math.floor(params.windowMs));
  const now = params.now ?? Date.now;

  const timestamps: number[] = [];

  function prune(nowMs: number) {
    const cutoff = nowMs - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  return {
    consume() {
      const nowMs = now();
      prune(nowMs);

      if (timestamps.length >= maxRequests) {
        const oldest = timestamps[0];
        const retryAfterMs = Math.max(0, oldest + windowMs - nowMs);
        return {
          allowed: false,
          retryAfterMs,
          remaining: 0,
        };
      }

      timestamps.push(nowMs);
      return {
        allowed: true,
        retryAfterMs: 0,
        remaining: Math.max(0, maxRequests - timestamps.length),
      };
    },

    reset() {
      timestamps.length = 0;
    },

    count() {
      prune(now());
      return timestamps.length;
    },
  };
}
