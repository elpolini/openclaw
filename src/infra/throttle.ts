/**
 * Throttle utility — ensures a function runs at most once per `intervalMs`.
 *
 * Leading call executes immediately; subsequent calls within the interval are
 * deferred so only the **last** pending call fires after the interval elapses.
 */

export type ThrottledFn<Args extends unknown[]> = {
  (...args: Args): void;
  /** Cancel any pending trailing invocation. */
  cancel: () => void;
  /** Immediately execute any pending trailing invocation. */
  flush: () => void;
};

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number,
): ThrottledFn<Args> {
  const interval = Math.max(0, Math.floor(intervalMs));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime = 0;
  let pendingArgs: Args | undefined;

  function invoke(args: Args) {
    lastCallTime = Date.now();
    fn(...args);
  }

  function throttled(...args: Args) {
    const elapsed = Date.now() - lastCallTime;
    if (elapsed >= interval) {
      clearPending();
      invoke(args);
      return;
    }
    pendingArgs = args;
    if (timer === undefined) {
      timer = setTimeout(() => {
        timer = undefined;
        if (pendingArgs !== undefined) {
          const saved = pendingArgs;
          pendingArgs = undefined;
          invoke(saved);
        }
      }, interval - elapsed);
    }
  }

  function clearPending() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    pendingArgs = undefined;
  }

  throttled.cancel = clearPending;

  throttled.flush = () => {
    if (pendingArgs !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      const saved = pendingArgs;
      pendingArgs = undefined;
      invoke(saved);
    }
  };

  return throttled;
}
