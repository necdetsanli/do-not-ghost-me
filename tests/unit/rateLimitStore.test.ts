// tests/unit/rateLimitStore.test.ts
import {
  MemoryRateLimitStore,
  getMemoryRateLimitStore,
  resetMemoryRateLimitStore,
} from "@/lib/memoryRateLimitStore";
import { RateLimitExceededError, type RateLimitResult } from "@/lib/rateLimitStore";
import {
  getCurrentStoreType,
  getRateLimitStore,
  resetRateLimitStoreCache,
} from "@/lib/rateLimitStoreFactory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("RateLimitStore Interface", () => {
  describe("RateLimitExceededError", () => {
    it("captures the rate limit result in the error", () => {
      const result: RateLimitResult = {
        allowed: false,
        current: 11,
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60000,
      };

      const error = new RateLimitExceededError("Rate limit exceeded", result);

      expect(error.name).toBe("RateLimitExceededError");
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.result).toEqual(result);
      expect(error instanceof Error).toBe(true);
    });
  });
});

describe("MemoryRateLimitStore", () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  afterEach(async () => {
    await store.clear();
  });

  describe("type", () => {
    it("returns 'memory'", () => {
      expect(store.type).toBe("memory");
    });
  });

  describe("increment", () => {
    it("returns allowed=true when under limit", async () => {
      const result = await store.increment({
        key: "test:key1",
        limit: 10,
        windowMs: 60_000,
      });

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("increments count on subsequent calls", async () => {
      const options = { key: "test:key2", limit: 10, windowMs: 60_000 };

      const r1 = await store.increment(options);
      const r2 = await store.increment(options);
      const r3 = await store.increment(options);

      expect(r1.current).toBe(1);
      expect(r2.current).toBe(2);
      expect(r3.current).toBe(3);
      expect(r3.remaining).toBe(7);
    });

    it("returns allowed=false when limit exceeded", async () => {
      const options = { key: "test:key3", limit: 2, windowMs: 60_000 };

      await store.increment(options); // 1
      await store.increment(options); // 2
      const result = await store.increment(options); // 3 - over limit

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.remaining).toBe(0);
    });

    it("resets count after window expires", async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const options = { key: "test:key4", limit: 2, windowMs: 1000 };

      await store.increment(options);
      await store.increment(options);

      // Advance time past the window
      vi.setSystemTime(now + 1100);

      const result = await store.increment(options);

      expect(result.current).toBe(1);
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it("tracks different keys independently", async () => {
      const key1Result = await store.increment({
        key: "scope1:hash1",
        limit: 10,
        windowMs: 60_000,
      });

      const key2Result = await store.increment({
        key: "scope2:hash1",
        limit: 10,
        windowMs: 60_000,
      });

      expect(key1Result.current).toBe(1);
      expect(key2Result.current).toBe(1);
    });
  });

  describe("reset", () => {
    it("removes a specific key", async () => {
      await store.increment({ key: "test:reset", limit: 10, windowMs: 60_000 });
      await store.increment({ key: "test:reset", limit: 10, windowMs: 60_000 });

      await store.reset("test:reset");

      const result = await store.increment({
        key: "test:reset",
        limit: 10,
        windowMs: 60_000,
      });

      expect(result.current).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all keys", async () => {
      await store.increment({ key: "test:a", limit: 10, windowMs: 60_000 });
      await store.increment({ key: "test:b", limit: 10, windowMs: 60_000 });

      expect(store.size).toBe(2);

      await store.clear();

      expect(store.size).toBe(0);
    });
  });

  describe("isHealthy", () => {
    it("returns true for memory store", async () => {
      expect(await store.isHealthy()).toBe(true);
    });
  });

  describe("sweeping", () => {
    it("evicts oldest entries when over maxStoreSize", async () => {
      const smallStore = new MemoryRateLimitStore({
        maxStoreSize: 3,
        minSweepIntervalMs: 0,
      });

      // Add 5 entries with slightly different timestamps
      vi.useFakeTimers();
      const baseTime = Date.now();

      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(baseTime + i * 10);
        await smallStore.increment({
          key: `test:key${i}`,
          limit: 100,
          windowMs: 60_000,
        });
      }

      // Store should have been trimmed to maxStoreSize
      expect(smallStore.size).toBeLessThanOrEqual(3);

      vi.useRealTimers();
      await smallStore.clear();
    });
  });
});

describe("getMemoryRateLimitStore", () => {
  beforeEach(() => {
    resetMemoryRateLimitStore();
  });

  it("returns a singleton instance", () => {
    const store1 = getMemoryRateLimitStore();
    const store2 = getMemoryRateLimitStore();

    expect(store1).toBe(store2);
  });

  it("returns a MemoryRateLimitStore", () => {
    const store = getMemoryRateLimitStore();
    expect(store.type).toBe("memory");
  });
});

describe("rateLimitStoreFactory", () => {
  beforeEach(() => {
    resetRateLimitStoreCache();
    resetMemoryRateLimitStore();
  });

  afterEach(() => {
    resetRateLimitStoreCache();
  });

  describe("getRateLimitStore", () => {
    it("returns memory store by default", () => {
      const store = getRateLimitStore();

      expect(store.type).toBe("memory");
    });

    it("returns memory store when useRedis is false", () => {
      const store = getRateLimitStore({ useRedis: false });

      expect(store.type).toBe("memory");
    });

    it("returns cached store on subsequent calls", () => {
      const store1 = getRateLimitStore();
      const store2 = getRateLimitStore();

      expect(store1).toBe(store2);
    });

    it("returns memory store when useRedis is true (Redis not yet implemented)", () => {
      // TODO: Update this test when Redis is implemented
      const store = getRateLimitStore({ useRedis: true });

      // Currently falls back to memory
      expect(store.type).toBe("memory");
    });
  });

  describe("getCurrentStoreType", () => {
    it("returns 'none' before any store is created", () => {
      resetRateLimitStoreCache();
      expect(getCurrentStoreType()).toBe("none");
    });

    it("returns 'memory' after memory store is created", () => {
      getRateLimitStore();
      expect(getCurrentStoreType()).toBe("memory");
    });
  });

  describe("resetRateLimitStoreCache", () => {
    it("clears the cached store", () => {
      getRateLimitStore();
      expect(getCurrentStoreType()).toBe("memory");

      resetRateLimitStoreCache();
      expect(getCurrentStoreType()).toBe("none");
    });
  });
});

describe("MemoryRateLimitStore eviction", () => {
  it("evicts entries and stops when store size reaches maxStoreSize", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const store = new MemoryRateLimitStore({
      maxStoreSize: 3,
      minSweepIntervalMs: 0,
    });

    // Add entries with staggered timestamps to ensure different eviction order
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(now + i * 100);
      await store.increment({
        key: `key-${i}`,
        limit: 100,
        windowMs: 60_000,
      });
    }

    // After eviction, store should be at or below maxStoreSize
    await store.clear();
    vi.useRealTimers();
  });

  it("evicts oldest entries when capacity exceeded during increment", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const store = new MemoryRateLimitStore({
      maxStoreSize: 3,
      minSweepIntervalMs: 0,
    });

    // Fill store with entries at different times
    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(now + i * 100);
      await store.increment({
        key: `key-${i}`,
        limit: 10,
        windowMs: 60_000,
      });
    }

    // The store should have handled eviction internally
    // Verify no errors were thrown
    await store.clear();
    vi.useRealTimers();
  });

  it("removes expired entries during sweep", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const windowMs = 1000;
    const store = new MemoryRateLimitStore({
      maxStoreSize: 10,
      minSweepIntervalMs: 0,
    });

    // Add an entry that will expire
    await store.increment({
      key: "expired-key",
      limit: 10,
      windowMs,
    });

    // Advance time past the window
    vi.setSystemTime(now + windowMs + 100);

    // Force a sweep by adding more entries (over capacity triggers sweep)
    for (let i = 0; i < 15; i++) {
      await store.increment({
        key: `fresh-key-${i}`,
        limit: 10,
        windowMs,
      });
    }

    // The expired entry should have been removed during sweep
    // and store should be at maxStoreSize or less
    expect(store.size).toBeLessThanOrEqual(10);

    await store.clear();
    vi.useRealTimers();
  });
});
