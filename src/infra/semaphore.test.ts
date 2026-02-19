import { describe, expect, it } from "vitest";
import { createSemaphore } from "./semaphore.js";

describe("semaphore", () => {
  it("allows up to concurrency limit", async () => {
    const sem = createSemaphore(2);
    expect(sem.limit()).toBe(2);
    expect(sem.active()).toBe(0);
    expect(sem.waiting()).toBe(0);

    const r1 = await sem.acquire();
    expect(sem.active()).toBe(1);

    const r2 = await sem.acquire();
    expect(sem.active()).toBe(2);

    r1();
    expect(sem.active()).toBe(1);

    r2();
    expect(sem.active()).toBe(0);
  });

  it("queues callers beyond the limit", async () => {
    const sem = createSemaphore(1);
    const order: number[] = [];

    const r1 = await sem.acquire();
    expect(sem.active()).toBe(1);

    // This should block
    const p2 = sem.acquire().then((r) => {
      order.push(2);
      return r;
    });
    const p3 = sem.acquire().then((r) => {
      order.push(3);
      return r;
    });
    expect(sem.waiting()).toBe(2);

    // Release first permit → second caller unblocked
    r1();
    const r2 = await p2;
    expect(sem.active()).toBe(1);
    expect(sem.waiting()).toBe(1);

    r2();
    const r3 = await p3;
    expect(sem.active()).toBe(1);
    expect(sem.waiting()).toBe(0);

    r3();
    expect(sem.active()).toBe(0);
    expect(order).toEqual([2, 3]);
  });

  it("run auto-releases on success", async () => {
    const sem = createSemaphore(1);
    const result = await sem.run(async () => {
      expect(sem.active()).toBe(1);
      return "done";
    });
    expect(result).toBe("done");
    expect(sem.active()).toBe(0);
  });

  it("run auto-releases on failure", async () => {
    const sem = createSemaphore(1);
    await expect(
      sem.run(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    expect(sem.active()).toBe(0);
  });

  it("processes queued tasks in FIFO order", async () => {
    const sem = createSemaphore(1);
    const order: string[] = [];

    const p1 = sem.run(async () => {
      order.push("a");
    });
    const p2 = sem.run(async () => {
      order.push("b");
    });
    const p3 = sem.run(async () => {
      order.push("c");
    });

    await Promise.all([p1, p2, p3]);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("clamps concurrency to at least 1", async () => {
    const sem = createSemaphore(0);
    expect(sem.limit()).toBe(1);
    const result = await sem.run(async () => "ok");
    expect(result).toBe("ok");
  });

  it("handles concurrent run calls correctly", async () => {
    const sem = createSemaphore(3);
    let peakActive = 0;

    const tasks = Array.from({ length: 10 }, (_, i) =>
      sem.run(async () => {
        peakActive = Math.max(peakActive, sem.active());
        // Simulate async work
        await new Promise((r) => setTimeout(r, 5));
        return i;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(peakActive).toBeLessThanOrEqual(3);
    expect(sem.active()).toBe(0);
  });
});
