import { describe, expect, it } from "vitest";
import { createSlidingWindowRateLimiter } from "./sliding-window-rate-limit.js";

describe("sliding-window rate limiter", () => {
  it("allows requests up to the limit", () => {
    let nowMs = 1_000;
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 3,
      windowMs: 1_000,
      now: () => nowMs,
    });

    expect(limiter.consume()).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.consume()).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume()).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("blocks after max requests within window", () => {
    let nowMs = 1_000;
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      now: () => nowMs,
    });

    limiter.consume();
    limiter.consume();

    const result = limiter.consume();
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.remaining).toBe(0);
  });

  it("allows requests as old ones slide out of window", () => {
    let nowMs = 1_000;
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      now: () => nowMs,
    });

    limiter.consume();
    nowMs += 200;
    limiter.consume();

    nowMs += 900; // First request is now outside the window (1000ms ago)
    const result = limiter.consume();
    expect(result.allowed).toBe(true);
  });

  it("calculates retryAfterMs based on oldest request", () => {
    let nowMs = 1_000;
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      now: () => nowMs,
    });

    limiter.consume(); // t=1000
    nowMs += 300;
    limiter.consume(); // t=1300

    nowMs += 100; // t=1400
    const result = limiter.consume();
    expect(result.allowed).toBe(false);
    // Oldest request at t=1000 + window 1000 = 2000, current 1400, retry after 600
    expect(result.retryAfterMs).toBe(600);
  });

  it("supports reset", () => {
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 1,
      windowMs: 10_000,
    });

    limiter.consume();
    expect(limiter.consume().allowed).toBe(false);

    limiter.reset();
    expect(limiter.consume().allowed).toBe(true);
  });

  it("reports current count", () => {
    let nowMs = 1_000;
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 5,
      windowMs: 1_000,
      now: () => nowMs,
    });

    expect(limiter.count()).toBe(0);
    limiter.consume();
    limiter.consume();
    expect(limiter.count()).toBe(2);

    nowMs += 1_100;
    expect(limiter.count()).toBe(0);
  });

  it("smooths burst vs sustained load better than fixed window", () => {
    let nowMs = 0;
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 10,
      windowMs: 1_000,
      now: () => nowMs,
    });

    // Use 8 of 10 at t=900ms
    nowMs = 900;
    for (let i = 0; i < 8; i++) {
      expect(limiter.consume().allowed).toBe(true);
    }

    // At t=1050ms (just after "window boundary" for fixed-window),
    // sliding window still remembers the 8 requests from 150ms ago
    nowMs = 1050;
    expect(limiter.consume().allowed).toBe(true);
    expect(limiter.consume().allowed).toBe(true);
    expect(limiter.consume().allowed).toBe(false); // 10 total in 1s window
  });
});
