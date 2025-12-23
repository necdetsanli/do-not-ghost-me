// src/lib/memoryRateLimitStore.ts
import type { RateLimitCheckOptions, RateLimitResult, RateLimitStore } from "@/lib/rateLimitStore";

/**
 * Internal state for a rate limit window.
 */
type WindowState = {
  count: number;
  windowStartedAt: number;
};

/**
 * In-memory implementation of RateLimitStore.
 *
 * This implementation is suitable for:
 * - Development and testing
 * - Single-instance deployments
 * - Serverless with limited concurrent executions
 *
 * Limitations:
 * - State is not shared across instances/processes
 * - State is lost on restart
 * - Memory grows with unique keys (bounded by maxStoreSize)
 *
 * For multi-instance deployments, use RedisRateLimitStore instead.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  public readonly type = "memory" as const;

  private store: Map<string, WindowState>;
  private lastSweep: number;
  private readonly maxStoreSize: number;
  private readonly minSweepIntervalMs: number;

  /**
   * Create a new in-memory rate limit store.
   *
   * @param options - Configuration options.
   * @param options.maxStoreSize - Maximum number of keys before eviction (default: 10000).
   * @param options.minSweepIntervalMs - Minimum time between sweeps (default: 5000).
   */
  constructor(options?: { maxStoreSize?: number; minSweepIntervalMs?: number }) {
    this.store = new Map();
    this.lastSweep = 0;
    this.maxStoreSize = options?.maxStoreSize ?? 10_000;
    this.minSweepIntervalMs = options?.minSweepIntervalMs ?? 5_000;
  }

  /**
   * Check and increment the rate limit for a key.
   */
  increment(options: RateLimitCheckOptions): Promise<RateLimitResult> {
    const { key, limit, windowMs } = options;
    const now = Date.now();

    // Get or create window state
    const state = this.getOrCreateState(key, now, windowMs);

    // Increment count
    state.count += 1;
    this.store.set(key, state);

    // Calculate reset time
    const resetAt = state.windowStartedAt + windowMs;

    // Build result
    const result: RateLimitResult = {
      allowed: state.count <= limit,
      current: state.count,
      limit,
      remaining: Math.max(0, limit - state.count),
      resetAt,
    };

    // Periodic sweep to prevent unbounded growth
    this.maybeSweep(now, windowMs);

    return Promise.resolve(result);
  }

  /**
   * Reset the rate limit for a key.
   */
  reset(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  /**
   * Clear all rate limit data.
   */
  clear(): Promise<void> {
    this.store.clear();
    this.lastSweep = 0;
    return Promise.resolve();
  }

  /**
   * Check if the store is healthy.
   * In-memory store is always healthy if it exists.
   */
  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Get current store size (for monitoring/testing).
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Get or create the window state for a key.
   */
  private getOrCreateState(key: string, now: number, windowMs: number): WindowState {
    const existing = this.store.get(key);

    // No existing state - create fresh
    if (existing === undefined) {
      return { count: 0, windowStartedAt: now };
    }

    // Window expired - reset
    if (now - existing.windowStartedAt > windowMs) {
      return { count: 0, windowStartedAt: now };
    }

    // Window still valid
    return existing;
  }

  /**
   * Periodically sweep expired entries and evict oldest if over capacity.
   */
  private maybeSweep(now: number, windowMs: number): void {
    // Check if sweep is needed
    const timeSinceLastSweep = now - this.lastSweep;
    const shouldSweep =
      this.store.size > this.maxStoreSize ||
      timeSinceLastSweep >= Math.max(windowMs, this.minSweepIntervalMs);

    if (!shouldSweep) {
      return;
    }

    this.lastSweep = now;

    // Remove expired entries
    for (const [key, state] of this.store.entries()) {
      if (now - state.windowStartedAt > windowMs) {
        this.store.delete(key);
      }
    }

    // Evict oldest if still over capacity
    if (this.store.size > this.maxStoreSize) {
      const entries = Array.from(this.store.entries()).sort(
        (a, b) => a[1].windowStartedAt - b[1].windowStartedAt,
      );

      for (const [key] of entries) {
        if (this.store.size <= this.maxStoreSize) {
          break;
        }
        this.store.delete(key);
      }
    }
  }
}

/**
 * Singleton instance for the default in-memory store.
 * This is stored on globalThis to survive module reloads in development.
 */
let defaultStore: MemoryRateLimitStore | null = null;

/**
 * Get the default in-memory rate limit store singleton.
 *
 * The singleton is stored on globalThis to survive hot module reloads
 * in development, preventing rate limit state loss during code changes.
 */
export function getMemoryRateLimitStore(): MemoryRateLimitStore {
  const globalAny = globalThis as { __memoryRateLimitStore?: MemoryRateLimitStore };

  globalAny.__memoryRateLimitStore ??= new MemoryRateLimitStore();

  defaultStore = globalAny.__memoryRateLimitStore;
  return defaultStore;
}

/**
 * Reset the default store (for testing).
 */
export function resetMemoryRateLimitStore(): void {
  const globalAny = globalThis as { __memoryRateLimitStore?: MemoryRateLimitStore };

  if (globalAny.__memoryRateLimitStore !== undefined) {
    void globalAny.__memoryRateLimitStore.clear();
  }
}
