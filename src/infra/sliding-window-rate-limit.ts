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

  // Ring buffer avoids O(n) shift(); head advances as entries expire.
  let buf: number[] = [];
  let head = 0;

  function activeCount() {
    return buf.length - head;
  }

  function prune(nowMs: number) {
    const cutoff = nowMs - windowMs;
    while (head < buf.length && buf[head] < cutoff) {
      head += 1;
    }
    // Compact when more than half the buffer is dead space
    if (head > 0 && head > buf.length / 2) {
      buf = buf.slice(head);
      head = 0;
    }
  }

  return {
    consume() {
      const nowMs = now();
      prune(nowMs);

      if (activeCount() >= maxRequests) {
        const oldest = buf[head];
        const retryAfterMs = Math.max(0, oldest + windowMs - nowMs);
        return {
          allowed: false,
          retryAfterMs,
          remaining: 0,
        };
      }

      buf.push(nowMs);
      return {
        allowed: true,
        retryAfterMs: 0,
        remaining: Math.max(0, maxRequests - activeCount()),
      };
    },

    reset() {
      buf = [];
      head = 0;
    },

    count() {
      prune(now());
      return activeCount();
    },
  };
}
