// src/lib/rateLimitStore.ts
/**
 * Abstract interface for rate limit storage backends.
 *
 * This abstraction enables swapping between different storage implementations:
 * - In-memory (current default, suitable for single-instance deployments)
 * - Redis (for multi-instance deployments via Upstash or similar)
 *
 * Implementations must be thread-safe and handle concurrent access.
 */

/**
 * Result of a rate limit check.
 */
export type RateLimitResult = {
  /**
   * Whether the request is allowed (within limits).
   */
  allowed: boolean;

  /**
   * Current count after incrementing.
   */
  current: number;

  /**
   * Maximum allowed requests in the window.
   */
  limit: number;

  /**
   * Remaining requests in the current window.
   */
  remaining: number;

  /**
   * Timestamp when the window resets (ms since epoch).
   */
  resetAt: number;
};

/**
 * Options for a rate limit check.
 */
export type RateLimitCheckOptions = {
  /**
   * Unique identifier for the rate limit (e.g., "scope:hashedIp").
   */
  key: string;

  /**
   * Maximum requests allowed in the window.
   */
  limit: number;

  /**
   * Window duration in milliseconds.
   */
  windowMs: number;
};

/**
 * Interface for rate limit storage backends.
 *
 * Implementations must:
 * - Be atomic (increment and check must be a single operation)
 * - Handle window expiration automatically
 * - Be safe for concurrent access
 */
export interface RateLimitStore {
  /**
   * Check and increment the rate limit for a key.
   *
   * This operation must be atomic: the count is incremented and the result
   * is returned in a single operation to prevent race conditions.
   *
   * @param options - Rate limit check options.
   * @returns The rate limit result after incrementing.
   */
  increment(options: RateLimitCheckOptions): Promise<RateLimitResult>;

  /**
   * Reset the rate limit for a key (for testing or manual override).
   *
   * @param key - The rate limit key to reset.
   */
  reset(key: string): Promise<void>;

  /**
   * Clear all rate limit data (for testing).
   */
  clear(): Promise<void>;

  /**
   * Check if the store is healthy/available.
   *
   * @returns True if the store is operational.
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get the store type identifier.
   */
  readonly type: "memory" | "redis";
}

/**
 * Error thrown when rate limit is exceeded.
 */
export class RateLimitExceededError extends Error {
  public readonly result: RateLimitResult;

  constructor(message: string, result: RateLimitResult) {
    super(message);
    this.name = "RateLimitExceededError";
    this.result = result;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
