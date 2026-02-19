import { describe, expect, it } from "vitest";
import { CircuitOpenError, createCircuitBreaker } from "./circuit-breaker.js";

describe("circuit breaker", () => {
  it("starts in closed state", () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1_000 });
    expect(cb.state()).toBe("closed");
    expect(cb.failures()).toBe(0);
  });

  it("passes through successful calls in closed state", async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1_000 });
    const result = await cb.call(async () => "ok");
    expect(result).toBe("ok");
    expect(cb.state()).toBe("closed");
  });

  it("counts consecutive failures", async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1_000 });
    const fail = () =>
      cb.call(async () => {
        throw new Error("boom");
      });

    await expect(fail()).rejects.toThrow("boom");
    expect(cb.failures()).toBe(1);
    expect(cb.state()).toBe("closed");

    await expect(fail()).rejects.toThrow("boom");
    expect(cb.failures()).toBe(2);
    expect(cb.state()).toBe("closed");
  });

  it("opens after reaching failure threshold", async () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1_000 });
    const fail = () =>
      cb.call(async () => {
        throw new Error("boom");
      });

    await expect(fail()).rejects.toThrow("boom");
    await expect(fail()).rejects.toThrow("boom");
    expect(cb.state()).toBe("open");
  });

  it("rejects with CircuitOpenError when open", async () => {
    let nowMs = 1_000;
    const cb = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 5_000,
      now: () => nowMs,
    });

    await expect(
      cb.call(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(cb.state()).toBe("open");

    nowMs += 1_000;
    try {
      await cb.call(async () => "should not run");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError);
      expect((err as CircuitOpenError).retryAfterMs).toBe(4_000);
    }
  });

  it("transitions to half-open after reset timeout", async () => {
    let nowMs = 1_000;
    const cb = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 5_000,
      now: () => nowMs,
    });

    await expect(
      cb.call(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(cb.state()).toBe("open");

    nowMs += 5_000;
    expect(cb.state()).toBe("half-open");
  });

  it("closes on success in half-open state", async () => {
    let nowMs = 1_000;
    const cb = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 5_000,
      now: () => nowMs,
    });

    await expect(
      cb.call(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    nowMs += 5_000;

    const result = await cb.call(async () => "recovered");
    expect(result).toBe("recovered");
    expect(cb.state()).toBe("closed");
    expect(cb.failures()).toBe(0);
  });

  it("reopens on failure in half-open state", async () => {
    let nowMs = 1_000;
    const cb = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 5_000,
      now: () => nowMs,
    });

    await expect(
      cb.call(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    nowMs += 5_000;

    await expect(
      cb.call(async () => {
        throw new Error("still broken");
      }),
    ).rejects.toThrow("still broken");
    expect(cb.state()).toBe("open");
  });

  it("resets failure count on success in closed state", async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1_000 });
    await expect(
      cb.call(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();
    expect(cb.failures()).toBe(1);

    await cb.call(async () => "ok");
    expect(cb.failures()).toBe(0);
  });

  it("supports manual reset", async () => {
    const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000 });
    await expect(
      cb.call(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();
    expect(cb.state()).toBe("open");

    cb.reset();
    expect(cb.state()).toBe("closed");
    expect(cb.failures()).toBe(0);

    const result = await cb.call(async () => "ok");
    expect(result).toBe("ok");
  });

  it("clamps failureThreshold to at least 1", async () => {
    const cb = createCircuitBreaker({ failureThreshold: 0, resetTimeoutMs: 1_000 });
    await expect(
      cb.call(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow();
    expect(cb.state()).toBe("open");
  });
});
