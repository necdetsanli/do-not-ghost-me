// src/lib/publicRateLimit.ts
import { formatUnknownError } from "@/lib/errorUtils";
import { getClientIp } from "@/lib/ip";
import { logError } from "@/lib/logger";
import { hashIp } from "@/lib/rateLimit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import net from "node:net";

const DEFAULT_MAX_REQUESTS_PER_WINDOW = 20;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_STORE_SIZE = 10_000;
const MIN_SWEEP_INTERVAL_MS = 5_000;

type RateLimitState = {
  count: number;
  windowStartedAt: number;
};

type EnforceArgs = {
  ip: string;
  scope: string;
  maxRequests?: number;
  windowMs?: number;
  maxStoreSize?: number;
  now?: number;
};

/**
 * Error type for public API rate limits.
 */
export class PublicRateLimitError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 429) {
    super(message);
    this.name = "PublicRateLimitError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Returns the shared in-memory store for public API rate limits.
 * Keys are scope-prefixed hashed IPs; no raw IPs are stored.
 */
function getStore(): Map<string, RateLimitState> {
  const globalAny = globalThis as {
    __publicRateLimitStore?: Map<string, RateLimitState>;
    __publicRateLimitLastSweep?: number;
  };

  globalAny.__publicRateLimitStore ??= new Map<string, RateLimitState>();
  globalAny.__publicRateLimitLastSweep ??= 0;
  return globalAny.__publicRateLimitStore;
}

/**
 * Resets the rate limit store.
 * Intended for tests to avoid cross-test leakage.
 */
export function resetPublicRateLimitStore(): void {
  getStore().clear();
}

/**
 * Returns the current rate limit state for a hashed IP key,
 * resetting the window when expired.
 */
function getState(key: string, now: number, windowMs: number): RateLimitState {
  const store = getStore();
  const existing: RateLimitState | undefined = store.get(key);

  if (existing === undefined) {
    const fresh: RateLimitState = { count: 0, windowStartedAt: now };
    store.set(key, fresh);
    return fresh;
  }

  if (now - existing.windowStartedAt > windowMs) {
    const reset: RateLimitState = { count: 0, windowStartedAt: now };
    store.set(key, reset);
    return reset;
  }

  return existing;
}

/**
 * Removes expired entries and optionally evicts oldest entries when the store grows too large.
 *
 * @param now - Current timestamp.
 * @param windowMs - Sliding window duration.
 * @param maxSize - Maximum allowed entries before eviction.
 */
function sweepStore(now: number, windowMs: number, maxSize: number): void {
  const store = getStore();

  if (store.size === 0) {
    return;
  }

  for (const [key, state] of store.entries()) {
    if (now - state.windowStartedAt > windowMs) {
      store.delete(key);
    }
  }

  if (store.size <= maxSize) {
    return;
  }

  const entries: Array<[string, RateLimitState]> = Array.from(store.entries());

  entries.sort((a, b) => {
    const timeDiff = a[1].windowStartedAt - b[1].windowStartedAt;
    return timeDiff !== 0 ? timeDiff : a[0].localeCompare(b[0]);
  });

  for (const [key] of entries) {
    if (store.size <= maxSize) {
      break;
    }
    store.delete(key);
  }

  const globalAny = globalThis as { __publicRateLimitLastSweep?: number };
  globalAny.__publicRateLimitLastSweep = now;
}

/**
 * Enforces a per-IP, per-scope sliding-window rate limit using hashed IP keys.
 *
 * @param args - Arguments describing the request context and limits.
 */
export function enforcePublicIpRateLimit(args: EnforceArgs): void {
  const maxRequests: number = args.maxRequests ?? DEFAULT_MAX_REQUESTS_PER_WINDOW;
  const windowMs: number = args.windowMs ?? DEFAULT_WINDOW_MS;
  const maxStoreSize: number = args.maxStoreSize ?? DEFAULT_MAX_STORE_SIZE;
  const now: number = args.now ?? Date.now();

  const trimmedIp: string = args.ip.trim();

  if (trimmedIp.length === 0) {
    throw new PublicRateLimitError("Client IP required");
  }

  if (net.isIP(trimmedIp) === 0) {
    throw new PublicRateLimitError("Client IP invalid");
  }

  const scope: string = args.scope.trim();

  if (scope.length === 0) {
    throw new PublicRateLimitError("Invalid rate limit scope");
  }

  const ipHash: string = hashIp(trimmedIp);
  const storeKey: string = `${scope}:${ipHash}`;

  const state: RateLimitState = getState(storeKey, now, windowMs);
  const nextCount: number = state.count + 1;

  state.count = nextCount;
  getStore().set(storeKey, state);

  const globalAny = globalThis as { __publicRateLimitLastSweep?: number };
  const lastSweep: number = globalAny.__publicRateLimitLastSweep ?? 0;

  if (
    getStore().size > maxStoreSize ||
    now - lastSweep >= Math.max(windowMs, MIN_SWEEP_INTERVAL_MS)
  ) {
    sweepStore(now, windowMs, maxStoreSize);
    globalAny.__publicRateLimitLastSweep = now;
  }

  if (nextCount > maxRequests) {
    throw new PublicRateLimitError("Too many requests");
  }
}

/**
 * Options for the public rate limit wrapper.
 */
type WithPublicRateLimitOptions = {
  /** Rate limit scope identifier (e.g., "company-search"). */
  scope: string;
  /** Maximum requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Log context prefix for error messages (e.g., "[GET /api/foo]"). */
  logContext?: string;
  /** Custom headers to include in error responses. Defaults to Cache-Control: no-store. */
  errorHeaders?: HeadersInit;
};

const DEFAULT_ERROR_HEADERS: HeadersInit = { "Cache-Control": "no-store" };

/**
 * Result of attempting to enforce public rate limiting.
 *
 * - If `allowed` is true, `clientIp` contains the validated IP string.
 * - If `allowed` is false, `response` contains the pre-built error response.
 */
export type RateLimitResult =
  | { allowed: true; clientIp: string }
  | { allowed: false; response: NextResponse };

/**
 * Enforces public IP-based rate limiting for a request.
 *
 * This function consolidates the common pattern of:
 * 1. Extracting client IP (fail-closed on null)
 * 2. Enforcing rate limits
 * 3. Handling rate limit errors with appropriate responses
 *
 * @param req - The Next.js request object.
 * @param options - Rate limit configuration.
 * @returns A result indicating success with the client IP, or failure with a response.
 *
 * @example
 * ```typescript
 * export async function GET(req: NextRequest): Promise<NextResponse> {
 *   const result = applyPublicRateLimit(req, {
 *     scope: "company-search",
 *     maxRequests: 60,
 *     windowMs: 60_000,
 *     logContext: "[GET /api/companies/search]",
 *   });
 *
 *   if (!result.allowed) {
 *     return result.response;
 *   }
 *
 *   // result.clientIp is available for use
 *   // ... business logic
 * }
 * ```
 */
export function applyPublicRateLimit(
  req: NextRequest,
  options: WithPublicRateLimitOptions,
): RateLimitResult {
  const { scope, maxRequests, windowMs, logContext, errorHeaders } = options;
  const headers = errorHeaders ?? DEFAULT_ERROR_HEADERS;

  // Step 1: Extract client IP (fail-closed)
  const clientIp: string | null = getClientIp(req);

  if (clientIp === null) {
    return {
      allowed: false,
      response: NextResponse.json({ error: "Rate limit unavailable" }, { status: 429, headers }),
    };
  }

  // Step 2: Enforce rate limit
  try {
    enforcePublicIpRateLimit({
      ip: clientIp,
      scope,
      maxRequests,
      windowMs,
    });
  } catch (error: unknown) {
    if (error instanceof PublicRateLimitError) {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Too many requests" },
          { status: error.statusCode, headers },
        ),
      };
    }

    // Log unexpected errors
    const context = logContext ?? `[applyPublicRateLimit:${scope}]`;
    logError(`${context} Rate limit failure`, {
      error: formatUnknownError(error),
    });

    return {
      allowed: false,
      response: NextResponse.json({ error: "Internal server error" }, { status: 500, headers }),
    };
  }

  return { allowed: true, clientIp };
}
