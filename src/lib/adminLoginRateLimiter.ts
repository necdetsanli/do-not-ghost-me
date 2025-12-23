// src/lib/adminLoginRateLimiter.ts
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { logError, logWarn } from "@/lib/logger";

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_RATE_LIMIT_LOCK_MS = 15 * 60 * 1000; // 15 minutes

type AdminLoginRateLimitState = {
  attempts: number;
  firstAttemptAt: number; // epoch ms
  lockedUntil: number | null;
};

export type AdminLoginRateLimiter = {
  isLocked: (ip: string, now: number) => Promise<boolean>;
  registerFailure: (ip: string, now: number) => Promise<void>;
  reset: (ip: string) => Promise<void>;
  readonly strategy: "memory" | "db";
};

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Hashes an IP address with a secret salt so that raw IPs are never persisted.
 *
 * @param ip - Raw client IP string (non-empty, trimmed by caller).
 * @returns Hex-encoded HMAC.
 */
export function hashAdminIp(ip: string): string {
  const saltFromEnv = env.RATE_LIMIT_IP_SALT ?? process.env.RATE_LIMIT_IP_SALT;
  const salt = saltFromEnv ?? "test-admin-login-rate-limit-salt";

  if (typeof saltFromEnv !== "string" || saltFromEnv.length === 0) {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("RATE_LIMIT_IP_SALT is required for admin login rate limiting");
    }
    // In tests, fall back to deterministic salt to keep regression coverage alive.
  }

  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(ip);
  return hmac.digest("hex");
}

// -----------------------------------------------------------------------------
// Memory strategy (default)
// -----------------------------------------------------------------------------

const memoryStore: Map<string, AdminLoginRateLimitState> = new Map();

function getMemoryState(ipHash: string, now: number): AdminLoginRateLimitState {
  const existing = memoryStore.get(ipHash);

  if (existing !== undefined) {
    if (existing.lockedUntil !== null) {
      // Lock active -> return as-is
      if (now < existing.lockedUntil) {
        return existing;
      }

      // Lock expired -> reset state
      const reset: AdminLoginRateLimitState = {
        attempts: 0,
        firstAttemptAt: now,
        lockedUntil: null,
      };
      memoryStore.set(ipHash, reset);
      return reset;
    }

    // Window expired resets attempts.
    if (now - existing.firstAttemptAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
      const reset: AdminLoginRateLimitState = {
        attempts: 0,
        firstAttemptAt: now,
        lockedUntil: null,
      };
      memoryStore.set(ipHash, reset);
      return reset;
    }

    return existing;
  }

  const initial: AdminLoginRateLimitState = {
    attempts: 0,
    firstAttemptAt: now,
    lockedUntil: null,
  };
  memoryStore.set(ipHash, initial);
  return initial;
}

function memoryIsLocked(ipHash: string, now: number): Promise<boolean> {
  const state = getMemoryState(ipHash, now);
  return Promise.resolve(state.lockedUntil !== null && now < state.lockedUntil);
}

function memoryRegisterFailure(ipHash: string, now: number): Promise<void> {
  const state = getMemoryState(ipHash, now);

  // Reset window if outside window
  if (now - state.firstAttemptAt > LOGIN_RATE_LIMIT_WINDOW_MS) {
    state.attempts = 0;
    state.firstAttemptAt = now;
    state.lockedUntil = null;
  }

  state.attempts += 1;

  if (state.attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    state.lockedUntil = now + LOGIN_RATE_LIMIT_LOCK_MS;
    logWarn("[admin-login] IP locked due to too many failed attempts (memory)", {
      ipHash,
      attempts: state.attempts,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
      lockMs: LOGIN_RATE_LIMIT_LOCK_MS,
      lockedUntil: state.lockedUntil,
    });
  }

  memoryStore.set(ipHash, state);
  return Promise.resolve();
}

function memoryReset(ipHash: string): Promise<void> {
  memoryStore.delete(ipHash);
  return Promise.resolve();
}

// -----------------------------------------------------------------------------
// DB strategy (feature-flagged)
// -----------------------------------------------------------------------------

async function dbIsLocked(ipHash: string, now: number): Promise<boolean> {
  try {
    const record = await prisma.adminLoginRateLimit.findUnique({
      where: { ipHash },
    });

    if (record === null) {
      return false;
    }

    const lockedUntilMs = record.lockedUntil?.getTime() ?? null;

    if (lockedUntilMs !== null && lockedUntilMs > now) {
      return true;
    }

    // Lock expired or window expired → reset state to avoid stale locks.
    if (
      (lockedUntilMs !== null && lockedUntilMs <= now) ||
      now - record.firstAttemptAt.getTime() > LOGIN_RATE_LIMIT_WINDOW_MS
    ) {
      await prisma.adminLoginRateLimit.update({
        where: { ipHash },
        data: {
          attempts: 0,
          firstAttemptAt: new Date(now),
          lockedUntil: null,
        },
      });
    }

    return false;
  } catch (error: unknown) {
    logError("[admin-login] Failed to read rate limit state (db)", { ipHash, error });
    // Fail open on store failure to avoid login outage.
    return false;
  }
}

async function dbRegisterFailure(ipHash: string, now: number): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.adminLoginRateLimit.findUnique({
        where: { ipHash },
      });

      const nowDate = new Date(now);
      let attempts = 1;
      let firstAttemptAt = nowDate;
      let lockedUntil: Date | null = null;

      if (existing !== null) {
        const windowExpired = now - existing.firstAttemptAt.getTime() > LOGIN_RATE_LIMIT_WINDOW_MS;
        const lockExpired =
          existing.lockedUntil !== null && existing.lockedUntil.getTime() <= now;

        if (lockExpired || windowExpired) {
          attempts = 1;
          firstAttemptAt = nowDate;
          lockedUntil = null;
        } else {
          attempts = existing.attempts + 1;
          firstAttemptAt = existing.firstAttemptAt;
          lockedUntil = existing.lockedUntil;
        }

        if (attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
          lockedUntil = new Date(now + LOGIN_RATE_LIMIT_LOCK_MS);
        }
      } else {
        if (attempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
          lockedUntil = new Date(now + LOGIN_RATE_LIMIT_LOCK_MS);
        }
      }

      await tx.adminLoginRateLimit.upsert({
        where: { ipHash },
        update: {
          attempts,
          firstAttemptAt,
          lockedUntil,
        },
        create: {
          ipHash,
          attempts,
          firstAttemptAt,
          lockedUntil,
        },
      });

      if (lockedUntil !== null) {
        logWarn("[admin-login] IP locked due to too many failed attempts (db)", {
          ipHash,
          attempts,
          windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
          lockMs: LOGIN_RATE_LIMIT_LOCK_MS,
          lockedUntil: lockedUntil.getTime(),
        });
      }
    });
  } catch (error: unknown) {
    logError("[admin-login] Failed to write rate limit state (db)", { ipHash, error });
  }
}

async function dbReset(ipHash: string): Promise<void> {
  try {
    await prisma.adminLoginRateLimit.deleteMany({
      where: { ipHash },
    });
  } catch (error: unknown) {
    logError("[admin-login] Failed to reset rate limit state (db)", { ipHash, error });
  }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

let cachedLimiter: AdminLoginRateLimiter | null = null;

export function getAdminLoginRateLimiter(): AdminLoginRateLimiter {
  if (cachedLimiter !== null) {
    return cachedLimiter;
  }

  const strategy: "memory" | "db" = env.ADMIN_LOGIN_RATE_LIMIT_STRATEGY ?? "memory";

  if (strategy === "db") {
    cachedLimiter = {
      strategy,
      isLocked: dbIsLocked,
      registerFailure: dbRegisterFailure,
      reset: dbReset,
    };
    return cachedLimiter;
  }

  cachedLimiter = {
    strategy: "memory",
    isLocked: memoryIsLocked,
    registerFailure: memoryRegisterFailure,
    reset: memoryReset,
  };
  return cachedLimiter;
}

/**
 * Testing hook to clear caches.
 */
export function resetAdminLoginRateLimiter(): void {
  cachedLimiter = null;
  memoryStore.clear();
}
