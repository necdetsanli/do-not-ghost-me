// src/lib/rateLimitStoreFactory.ts
import { getMemoryRateLimitStore } from "@/lib/memoryRateLimitStore";
import type { RateLimitStore } from "@/lib/rateLimitStore";

/**
 * Configuration for rate limit store selection.
 */
export type RateLimitStoreConfig = {
  /**
   * Whether to use Redis backend (requires UPSTASH_REDIS_* env vars).
   * Default: false (use in-memory store).
   */
  useRedis?: boolean;

  /**
   * Whether to fail open (allow requests) when the store is unavailable.
   * Default: true for Redis, N/A for memory.
   */
  failOpen?: boolean;
};

/**
 * Singleton store instance.
 * Cached to avoid recreating the store on every request.
 */
let cachedStore: RateLimitStore | null = null;
let cachedConfig: RateLimitStoreConfig | null = null;

/**
 * Get the appropriate rate limit store based on configuration.
 *
 * This factory function returns:
 * - MemoryRateLimitStore when useRedis is false (default)
 * - RedisRateLimitStore when useRedis is true (not yet implemented)
 *
 * The store is cached as a singleton for the lifetime of the process.
 * Calling with different config will return the cached store (config is
 * only used on first call).
 *
 * @param config - Configuration options.
 * @returns The rate limit store instance.
 */
export function getRateLimitStore(config?: RateLimitStoreConfig): RateLimitStore {
  const resolvedConfig: RateLimitStoreConfig = {
    useRedis: config?.useRedis ?? false,
    failOpen: config?.failOpen ?? true,
  };

  // Return cached store if available
  if (cachedStore !== null && cachedConfig !== null) {
    return cachedStore;
  }

  // Create appropriate store based on config
  if (resolvedConfig.useRedis) {
    // TODO: Implement RedisRateLimitStore when Redis migration is ready
    // For now, fall back to memory store with a warning
    // logWarn("[rateLimitStoreFactory] Redis store not yet implemented, using memory store");
    cachedStore = getMemoryRateLimitStore();
  } else {
    cachedStore = getMemoryRateLimitStore();
  }

  cachedConfig = resolvedConfig;
  return cachedStore;
}

/**
 * Reset the cached store (for testing).
 */
export function resetRateLimitStoreCache(): void {
  cachedStore = null;
  cachedConfig = null;
}

/**
 * Get the current store type (for monitoring/debugging).
 */
export function getCurrentStoreType(): "memory" | "redis" | "none" {
  if (cachedStore === null) {
    return "none";
  }
  return cachedStore.type;
}
