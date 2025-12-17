// tests/unit/rateLimit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { PositionCategory } from "@prisma/client";

type EnvShape = {
  NODE_ENV: "production" | "development" | "test";
  RATE_LIMIT_IP_SALT: string;
  RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: number;
  RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: number;
};

type TxShape = {
  $executeRaw: ReturnType<typeof vi.fn>;
  reportIpDailyLimit: {
    upsert: ReturnType<typeof vi.fn>;
  };
  reportIpCompanyLimit: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const {
  env,
  toUtcDayKeyMock,
  logWarnMock,
  logErrorMock,
  prismaTransactionMock,
} = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test",
    RATE_LIMIT_IP_SALT: "unit-test-salt",
    RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: 2,
    RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: 3,
  } as EnvShape,

  toUtcDayKeyMock: vi.fn(),
  logWarnMock: vi.fn(),
  logErrorMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env }));

vi.mock("@/lib/dates", () => ({
  toUtcDayKey: toUtcDayKeyMock,
}));

vi.mock("@/lib/logger", () => ({
  logWarn: logWarnMock,
  logError: logErrorMock,
}));

vi.mock("@/lib/errorUtils", () => ({
  formatUnknownError: (e: unknown) => String(e),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: prismaTransactionMock,
  },
}));

/**
 * Computes the expected HMAC SHA-256 for a given IP and salt.
 *
 * @param ip - Raw client IP.
 * @param salt - Secret salt configured for rate limiting.
 * @returns Lowercase hex digest of the HMAC.
 */
function hmacHex(ip: string, salt: string): string {
  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(ip);
  return hmac.digest("hex");
}

/**
 * Creates an Error shaped like a Prisma unique constraint violation.
 *
 * @param message - Optional message for the error.
 * @returns An Error object with a Prisma-like `code`.
 */
function makeP2002Error(message = "P2002"): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = "P2002";
  return err;
}

/**
 * Builds a minimal transaction object that matches the subset of Prisma client
 * used by rateLimit.ts inside prisma.$transaction().
 *
 * @returns A transaction-shaped object with all methods mocked.
 */
function makeTx(): TxShape {
  return {
    $executeRaw: vi.fn(),
    reportIpDailyLimit: {
      upsert: vi.fn(),
    },
    reportIpCompanyLimit: {
      count: vi.fn(),
      create: vi.fn(),
    },
  };
}

/**
 * Dynamically imports lib/rateLimit after resetting module state.
 *
 * @returns An object containing:
 * - mod: the rateLimit module
 * - errorMod: the rateLimitError module
 */
async function loadRateLimit() {
  vi.resetModules();

  const errorMod = await import("@/lib/rateLimitError");
  const mod = await import("@/lib/rateLimit");

  return { mod, errorMod };
}

describe("lib/rateLimit.ts", () => {
  const dayKey = "2025-01-01";
  const companyId = "company-1";
  const positionCategory = PositionCategory.ENGINEERING;
  const positionDetailRaw = "  Backend Developer  ";

  beforeEach(() => {
    vi.clearAllMocks();

    env.NODE_ENV = "test";
    env.RATE_LIMIT_IP_SALT = "unit-test-salt";
    env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = 2;
    env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = 3;

    toUtcDayKeyMock.mockReturnValue(dayKey);
  });

  describe("hashIp", () => {
    it("returns a deterministic hex HMAC of the trimmed IP", async () => {
      const { mod } = await loadRateLimit();

      const out = mod.hashIp(" 203.0.113.5 ");
      const expected = hmacHex("203.0.113.5", env.RATE_LIMIT_IP_SALT);

      expect(out).toBe(expected);
      expect(out).toMatch(/^[0-9a-f]{64}$/);
    });

    it("throws ReportRateLimitError when IP is empty after trimming", async () => {
      const { mod, errorMod } = await loadRateLimit();

      expect(() => mod.hashIp("   ")).toThrow(errorMod.ReportRateLimitError);
      expect(() => mod.hashIp("   ")).toThrow(errorMod.MISSING_IP_MESSAGE);
    });
  });

  describe("enforceReportLimitForIpCompanyPosition", () => {
    it("throws missing-ip when ip is null/undefined/empty/'unknown' and does not touch DB", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const undefinedIp: string | undefined = undefined;

      await expect(
        mod.enforceReportLimitForIpCompanyPosition({
          ip: null,
          companyId,
          positionCategory,
          positionDetail: positionDetailRaw,
        }),
      ).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);

      await expect(
        mod.enforceReportLimitForIpCompanyPosition({
          ip: undefinedIp,
          companyId,
          positionCategory,
          positionDetail: positionDetailRaw,
        }),
      ).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);

      await expect(
        mod.enforceReportLimitForIpCompanyPosition({
          ip: "   ",
          companyId,
          positionCategory,
          positionDetail: positionDetailRaw,
        }),
      ).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);

      await expect(
        mod.enforceReportLimitForIpCompanyPosition({
          ip: " unknown ",
          companyId,
          positionCategory,
          positionDetail: positionDetailRaw,
        }),
      ).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);

      expect(prismaTransactionMock).toHaveBeenCalledTimes(0);
    });

    it("happy path: upserts daily row, inserts company position row, no logs", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.upsert.mockResolvedValueOnce({
        id: "daily-1",
        count: 1,
      });
      tx.$executeRaw.mockResolvedValueOnce(0);

      tx.reportIpCompanyLimit.count.mockResolvedValueOnce(0);
      tx.reportIpCompanyLimit.create.mockResolvedValueOnce(undefined);

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      const ip = "203.0.113.5";
      const expectedIpHash = hmacHex(ip, env.RATE_LIMIT_IP_SALT);
      const expectedPositionKey = `${positionCategory}:${positionDetailRaw
        .trim()
        .toLowerCase()}`;

      await mod.enforceReportLimitForIpCompanyPosition({
        ip,
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      expect(tx.reportIpDailyLimit.upsert).toHaveBeenCalledWith({
        where: { uniq_ip_day: { ipHash: expectedIpHash, day: dayKey } },
        create: { ipHash: expectedIpHash, day: dayKey, count: 1 },
        update: { count: { increment: 1 } },
        select: { id: true, count: true },
      });

      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);

      expect(tx.reportIpCompanyLimit.count).toHaveBeenCalledWith({
        where: { ipHash: expectedIpHash, companyId },
      });

      expect(tx.reportIpCompanyLimit.create).toHaveBeenCalledWith({
        data: {
          ipHash: expectedIpHash,
          companyId,
          positionKey: expectedPositionKey,
        },
      });

      expect(logWarnMock).toHaveBeenCalledTimes(0);
      expect(logErrorMock).toHaveBeenCalledTimes(0);
    });

    it("daily limit exceeded throws daily-ip-limit and does not touch company lock/path", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.upsert.mockResolvedValueOnce({
        id: "daily-1",
        count: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY + 1,
      });

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      const call = mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      await expect(call).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);
      await expect(call).rejects.toThrow(
        "You have reached the daily report limit.",
      );

      expect(tx.$executeRaw).toHaveBeenCalledTimes(0);
      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("daily upsert unexpected error logs and rethrows", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();
      const dbErr = new Error("db failure");

      tx.reportIpDailyLimit.upsert.mockRejectedValueOnce(dbErr);

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      const call = mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      await expect(call).rejects.toBe(dbErr);
      expect(logErrorMock).toHaveBeenCalledTimes(1);
    });

    it("per-company limit exceeded throws company-position-limit", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.upsert.mockResolvedValueOnce({
        id: "daily-1",
        count: 1,
      });
      tx.$executeRaw.mockResolvedValueOnce(0);

      tx.reportIpCompanyLimit.count.mockResolvedValueOnce(
        env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
      );

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      const call = mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      await expect(call).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);
      await expect(call).rejects.toThrow(
        "You have reached the maximum number of reports for this company.",
      );

      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("duplicate company+position (P2002 on create) throws duplicate message", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.upsert.mockResolvedValueOnce({
        id: "daily-1",
        count: 1,
      });
      tx.$executeRaw.mockResolvedValueOnce(0);

      tx.reportIpCompanyLimit.count.mockResolvedValueOnce(0);

      const p2002 = makeP2002Error();
      tx.reportIpCompanyLimit.create.mockRejectedValueOnce(p2002);

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      const call = mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      await expect(call).rejects.toBeInstanceOf(errorMod.ReportRateLimitError);
      await expect(call).rejects.toThrow(
        "You have already submitted a report for this position at this company.",
      );

      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("unexpected error on company/position create logs and rethrows", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.upsert.mockResolvedValueOnce({
        id: "daily-1",
        count: 1,
      });
      tx.$executeRaw.mockResolvedValueOnce(0);

      tx.reportIpCompanyLimit.count.mockResolvedValueOnce(0);

      const dbErr = new Error("db failure");
      tx.reportIpCompanyLimit.create.mockRejectedValueOnce(dbErr);

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      const call = mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      await expect(call).rejects.toBe(dbErr);
      expect(logErrorMock).toHaveBeenCalledTimes(1);
    });

    it("throws a ReportRateLimitError that satisfies the type guard", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.upsert.mockResolvedValueOnce({
        id: "daily-1",
        count: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY + 1,
      });

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      try {
        await mod.enforceReportLimitForIpCompanyPosition({
          ip: "203.0.113.5",
          companyId,
          positionCategory,
          positionDetail: positionDetailRaw,
        });
        throw new Error(
          "Expected enforceReportLimitForIpCompanyPosition to throw.",
        );
      } catch (err: unknown) {
        expect(errorMod.isReportRateLimitError(err)).toBe(true);
      }
    });
  });
});
