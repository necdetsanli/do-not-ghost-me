// tests/integration/rateLimit.concurrency.realdb.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PositionCategory } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const FIXED_DAY_KEY = "2025-01-01";

/**
 * Hook timeouts for real DB tests.
 * Prisma migrate deploy can easily exceed Vitest's default 10s hook timeout.
 */
const BEFORE_ALL_TIMEOUT_MS = 60_000;
const BEFORE_EACH_TIMEOUT_MS = 30_000;
const AFTER_ALL_TIMEOUT_MS = 30_000;

/**
 * We mock toUtcDayKey to keep the DB state deterministic.
 */
vi.mock("@/lib/dates", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    toUtcDayKey: () => FIXED_DAY_KEY,
  };
});

/**
 * Resolves the Prisma CLI path in a cross-platform way.
 *
 * @returns A CLI executable path or a fallback command name.
 */
function resolvePrismaCli(): string {
  const binName = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const local = path.resolve(process.cwd(), "node_modules", ".bin", binName);

  if (fs.existsSync(local) === true) {
    return local;
  }

  return "prisma";
}

/**
 * Runs Prisma migrations against the current DATABASE_URL.
 *
 * @returns void
 */
function runPrismaMigrateDeploy(): void {
  const prismaCli = resolvePrismaCli();

  execFileSync(prismaCli, ["migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env },
  });
}

/**
 * Ensures DATABASE_URL exists and looks usable for real DB integration tests.
 *
 * @returns The normalized DATABASE_URL.
 */
function requireDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  const url = typeof raw === "string" ? raw.trim() : "";

  if (url.length === 0) {
    throw new Error(
      [
        "DATABASE_URL is required for real DB concurrency tests.",
        "Make sure tests/setup/test-env.ts is loaded (Vitest setupFiles) and provides DATABASE_URL,",
        "or set TEST_DATABASE_URL in your environment so test-env can override DATABASE_URL.",
      ].join("\n"),
    );
  }

  return url;
}

describe.sequential("rateLimit concurrency (real DB)", () => {
  beforeAll(async () => {
    requireDatabaseUrl();

    /**
     * Apply migrations once. We intentionally do this before importing Prisma,
     * so schema exists before any DB queries happen.
     */
    vi.resetModules();
    runPrismaMigrateDeploy();
    vi.resetModules();
  }, BEFORE_ALL_TIMEOUT_MS);

  afterAll(async () => {
    try {
      vi.resetModules();
      const dbMod = await import("@/lib/db");
      await dbMod.prisma.$disconnect();
    } catch {
      // Ignore: cleanup best-effort.
    }
  }, AFTER_ALL_TIMEOUT_MS);

  beforeEach(async () => {
    /**
     * Clean tables for test isolation.
     */
    const dbMod = await import("@/lib/db");
    await dbMod.prisma.reportIpCompanyLimit.deleteMany();
    await dbMod.prisma.reportIpDailyLimit.deleteMany();
  }, BEFORE_EACH_TIMEOUT_MS);

  it("handles concurrent daily limit row creation without throwing when under max", async () => {
    const rateLimitMod = await import("@/lib/rateLimit");
    const dbMod = await import("@/lib/db");

    const p1 = rateLimitMod.enforceReportLimitForIpCompanyPosition({
      ip: "203.0.113.10",
      companyId: "c1",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "backend",
    });

    const p2 = rateLimitMod.enforceReportLimitForIpCompanyPosition({
      ip: "203.0.113.10",
      companyId: "c1",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "frontend",
    });

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(0);

    const ipHash = rateLimitMod.hashIp("203.0.113.10");

    const dailyRow = await dbMod.prisma.reportIpDailyLimit.findUnique({
      where: {
        uniq_ip_day: {
          ipHash,
          day: FIXED_DAY_KEY,
        },
      },
    });

    expect(dailyRow).not.toBeNull();
    expect(dailyRow?.count).toBe(2);

    const companyRows = await dbMod.prisma.reportIpCompanyLimit.findMany({
      where: {
        ipHash,
        companyId: "c1",
      },
    });

    expect(companyRows).toHaveLength(2);
  });

  it("enforces per-position uniqueness under concurrent requests (one succeeds, one rejects) and rolls back the failed transaction", async () => {
    const rateLimitMod = await import("@/lib/rateLimit");
    const dbMod = await import("@/lib/db");

    const args = {
      ip: "203.0.113.11",
      companyId: "c2",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "same-position",
    };

    const p1 = rateLimitMod.enforceReportLimitForIpCompanyPosition(args);
    const p2 = rateLimitMod.enforceReportLimitForIpCompanyPosition(args);

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    const msg = reason instanceof Error ? reason.message : String(reason);

    expect(msg).toMatch(/already submitted a report/i);

    const ipHash = rateLimitMod.hashIp("203.0.113.11");

    const dailyRow = await dbMod.prisma.reportIpDailyLimit.findUnique({
      where: {
        uniq_ip_day: {
          ipHash,
          day: FIXED_DAY_KEY,
        },
      },
    });

    expect(dailyRow).not.toBeNull();
    expect(dailyRow?.count).toBe(1);

    const companyRows = await dbMod.prisma.reportIpCompanyLimit.findMany({
      where: {
        ipHash,
        companyId: "c2",
      },
    });

    expect(companyRows).toHaveLength(1);
  });
});
