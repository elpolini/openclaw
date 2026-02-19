/**
 * Async counting semaphore for bounding concurrent operations.
 *
 * `acquire()` returns a release function; callers beyond the concurrency
 * limit are queued and resolved in FIFO order as permits become available.
 */

export type Semaphore = {
  /** Acquire a permit. Resolves with a release function when a slot is available. */
  acquire: () => Promise<() => void>;
  /** Run `fn` inside a semaphore permit (auto-releases on completion). */
  run: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Number of currently occupied permits. */
  active: () => number;
  /** Number of callers waiting for a permit. */
  waiting: () => number;
  /** Total concurrency limit. */
  limit: () => number;
};

export function createSemaphore(concurrency: number): Semaphore {
  const maxConcurrency = Math.max(1, Math.floor(concurrency));
  let activeCount = 0;
  const queue: Array<() => void> = [];

  function release() {
    activeCount -= 1;
    const next = queue.shift();
    if (next) {
      activeCount += 1;
      next();
    }
  }

  function acquire(): Promise<() => void> {
    if (activeCount < maxConcurrency) {
      activeCount += 1;
      return Promise.resolve(release);
    }
    return new Promise<() => void>((resolve) => {
      queue.push(() => resolve(release));
    });
  }

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    const releaseFn = await acquire();
    try {
      return await fn();
    } finally {
      releaseFn();
    }
  }

  return {
    acquire,
    run,
    active: () => activeCount,
    waiting: () => queue.length,
    limit: () => maxConcurrency,
  };
}
