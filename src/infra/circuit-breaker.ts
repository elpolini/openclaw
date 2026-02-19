/**
 * Circuit breaker for resilient provider/service calls.
 *
 * States:
 * - **closed** – requests flow normally; failures are counted.
 * - **open** – requests are rejected immediately; after `resetTimeoutMs` the breaker
 *   transitions to half-open.
 * - **half-open** – a single probe request is allowed; success closes the breaker,
 *   failure reopens it.
 */

export type CircuitBreakerState = "closed" | "open" | "half-open";

export type CircuitBreakerOptions = {
  /** Number of consecutive failures before opening the circuit. */
  failureThreshold: number;
  /** Time in ms to wait before transitioning from open → half-open. */
  resetTimeoutMs: number;
  /** Optional clock override for testing. */
  now?: () => number;
};

export type CircuitBreaker = {
  /** Execute `fn` through the breaker. Rejects with a `CircuitOpenError` when open. */
  call: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Current state of the breaker. */
  state: () => CircuitBreakerState;
  /** Number of consecutive failures recorded in the current closed window. */
  failures: () => number;
  /** Reset the breaker to the closed state. */
  reset: () => void;
};

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("Circuit breaker is open");
    this.name = "CircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const failureThreshold = Math.max(1, Math.floor(options.failureThreshold));
  const resetTimeoutMs = Math.max(0, Math.floor(options.resetTimeoutMs));
  const now = options.now ?? Date.now;

  let state: CircuitBreakerState = "closed";
  let consecutiveFailures = 0;
  let openedAt = 0;

  function transitionToOpen() {
    state = "open";
    openedAt = now();
  }

  function transitionToClosed() {
    state = "closed";
    consecutiveFailures = 0;
    openedAt = 0;
  }

  function shouldTransitionToHalfOpen(): boolean {
    return state === "open" && now() - openedAt >= resetTimeoutMs;
  }

  return {
    async call<T>(fn: () => Promise<T>): Promise<T> {
      if (shouldTransitionToHalfOpen()) {
        state = "half-open";
      }

      if (state === "open") {
        const elapsed = now() - openedAt;
        throw new CircuitOpenError(Math.max(0, resetTimeoutMs - elapsed));
      }

      try {
        const result = await fn();
        // Success in half-open → close the circuit
        if (state === "half-open") {
          transitionToClosed();
        } else {
          consecutiveFailures = 0;
        }
        return result;
      } catch (err) {
        if (state === "half-open") {
          // Failure in half-open → reopen
          transitionToOpen();
        } else {
          consecutiveFailures += 1;
          if (consecutiveFailures >= failureThreshold) {
            transitionToOpen();
          }
        }
        throw err;
      }
    },

    state: () => {
      if (shouldTransitionToHalfOpen()) {
        return "half-open";
      }
      return state;
    },

    failures: () => consecutiveFailures,

    reset: () => {
      transitionToClosed();
    },
  };
}
