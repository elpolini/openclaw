import { afterEach, describe, expect, it, vi } from "vitest";
import { throttle } from "./throttle.js";

describe("throttle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes immediately on first call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("a");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("defers subsequent calls within interval", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("a");
    throttled("b");
    throttled("c");

    // Only first call is immediate
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");

    vi.advanceTimersByTime(100);
    // Last pending call fires
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("c");
  });

  it("allows call after interval elapses", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("a");
    vi.advanceTimersByTime(100);

    throttled("b");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("cancel prevents trailing invocation", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("a");
    throttled("b");
    throttled.cancel();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("flush executes pending invocation immediately", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("a");
    throttled("b");

    throttled.flush();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");

    // No extra call after timer
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("flush is a no-op when nothing is pending", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it("works with zero interval", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 0);

    throttled("a");
    throttled("b");
    // Both should execute since interval is 0
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
