import { describe, expect, it } from "vitest";
import { createLruCache } from "./lru-cache.js";

describe("LRU cache", () => {
  it("stores and retrieves values", () => {
    const cache = createLruCache<number>({ maxSize: 3 });
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.has("a")).toBe(true);
  });

  it("returns undefined for missing keys", () => {
    const cache = createLruCache<number>({ maxSize: 3 });
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.has("missing")).toBe(false);
  });

  it("evicts least-recently-used when maxSize exceeded", () => {
    const cache = createLruCache<number>({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.has("a")).toBe(false);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.size()).toBe(2);
  });

  it("refreshes LRU order on get", () => {
    const cache = createLruCache<number>({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);

    // Access "a" to make it recently used
    cache.get("a");

    cache.set("c", 3);
    // "b" should be evicted (least recently used), "a" stays
    expect(cache.has("b")).toBe(false);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("refreshes LRU order on set (update)", () => {
    const cache = createLruCache<number>({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);

    // Update "a" to make it recently used
    cache.set("a", 10);

    cache.set("c", 3);
    // "b" should be evicted
    expect(cache.has("b")).toBe(false);
    expect(cache.get("a")).toBe(10);
    expect(cache.get("c")).toBe(3);
  });

  it("expires entries after TTL", () => {
    let nowMs = 1_000;
    const cache = createLruCache<number>({ maxSize: 10, ttlMs: 5_000, now: () => nowMs });

    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);

    nowMs += 5_000;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.has("a")).toBe(false);
  });

  it("does not expire entries before TTL", () => {
    let nowMs = 1_000;
    const cache = createLruCache<number>({ maxSize: 10, ttlMs: 5_000, now: () => nowMs });

    cache.set("a", 1);
    nowMs += 4_999;
    expect(cache.get("a")).toBe(1);
  });

  it("supports delete", () => {
    const cache = createLruCache<number>({ maxSize: 3 });
    cache.set("a", 1);
    expect(cache.delete("a")).toBe(true);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.delete("a")).toBe(false);
  });

  it("supports clear", () => {
    const cache = createLruCache<number>({ maxSize: 3 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("returns keys in insertion order", () => {
    const cache = createLruCache<number>({ maxSize: 5 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.keys()).toEqual(["a", "b", "c"]);
  });

  it("clamps maxSize to at least 1", () => {
    const cache = createLruCache<number>({ maxSize: 0 });
    cache.set("a", 1);
    expect(cache.size()).toBe(1);
    expect(cache.get("a")).toBe(1);
  });

  it("works without TTL", () => {
    const cache = createLruCache<string>({ maxSize: 2, ttlMs: 0 });
    cache.set("x", "val");
    expect(cache.get("x")).toBe("val");
  });
});
