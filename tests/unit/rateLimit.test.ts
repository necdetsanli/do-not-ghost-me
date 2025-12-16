import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { PositionCategory } from "@prisma/client";

type EnvShape = {
  NODE_ENV: "production" | "development" | "test";
  RATE_LIMIT_IP_SALT: string;
  RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: number;
  RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: number;
};

type DailyRow = {
  id: string;
  ipHash: string;
  day: string;
  count: number;
};

type TxShape = {
  reportIpDailyLimit: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
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

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: prismaTransactionMock,
  },
}));

function hmacHex(ip: string, salt: string): string {
  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(ip);
  return hmac.digest("hex");
}

function makeP2002Error(message = "P2002"): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = "P2002";
  return err;
}

function makeTx(): TxShape {
  return {
    reportIpDailyLimit: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    reportIpCompanyLimit: {
      count: vi.fn(),
      create: vi.fn(),
    },
  };
}

async function loadRateLimit() {
  vi.resetModules();

  // IMPORTANT: import rateLimitError AFTER reset so class identity matches what rateLimit uses.
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

    it("happy path: creates daily row, increments company position row, no logs", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(null);
      tx.reportIpDailyLimit.create.mockResolvedValueOnce(undefined);

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

      expect(tx.reportIpDailyLimit.findUnique).toHaveBeenCalledWith({
        where: { uniq_ip_day: { ipHash: expectedIpHash, day: dayKey } },
      });

      expect(tx.reportIpDailyLimit.create).toHaveBeenCalledWith({
        data: { ipHash: expectedIpHash, day: dayKey, count: 1 },
      });

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

    it("daily row: on concurrent insert (P2002), re-reads and increments when below max", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(null);

      const p2002 = makeP2002Error();
      tx.reportIpDailyLimit.create.mockRejectedValueOnce(p2002);

      const concurrent: DailyRow = {
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: 1,
      };
      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(concurrent);

      tx.reportIpDailyLimit.update.mockResolvedValueOnce(undefined);

      tx.reportIpCompanyLimit.count.mockResolvedValueOnce(0);
      tx.reportIpCompanyLimit.create.mockResolvedValueOnce(undefined);

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      await mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      expect(tx.reportIpDailyLimit.update).toHaveBeenCalledWith({
        where: { id: "daily-1" },
        data: { count: { increment: 1 } },
      });

      expect(logWarnMock).toHaveBeenCalledTimes(0);
      expect(logErrorMock).toHaveBeenCalledTimes(0);
    });

    it("daily row: on concurrent insert (P2002), throws daily-ip-limit when concurrent count is already max", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(null);

      const p2002 = makeP2002Error();
      tx.reportIpDailyLimit.create.mockRejectedValueOnce(p2002);

      const concurrentAtMax: DailyRow = {
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
      };
      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(concurrentAtMax);

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
        "You have reached the daily report limit for this IP address.",
      );

      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("daily row: on concurrent insert (P2002), rethrows if follow-up lookup returns null", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(null);

      const p2002 = makeP2002Error();
      tx.reportIpDailyLimit.create.mockRejectedValueOnce(p2002);

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(null);

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

      await expect(call).rejects.toBe(p2002);
      expect(logErrorMock).toHaveBeenCalledTimes(1);
    });

    it("daily row: non-unique error on create logs and rethrows", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(null);

      const dbErr = new Error("db failure");
      tx.reportIpDailyLimit.create.mockRejectedValueOnce(dbErr);

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

    it("existing daily row at max throws daily-ip-limit", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      const existingAtMax: DailyRow = {
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
      };

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(existingAtMax);

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
        "You have reached the daily report limit for this IP address.",
      );

      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("existing daily row below max increments via update", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      const existing: DailyRow = {
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: 1,
      };

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce(existing);
      tx.reportIpDailyLimit.update.mockResolvedValueOnce(undefined);

      tx.reportIpCompanyLimit.count.mockResolvedValueOnce(0);
      tx.reportIpCompanyLimit.create.mockResolvedValueOnce(undefined);

      prismaTransactionMock.mockImplementation(async (fn: unknown) => {
        const cb = fn as (t: TxShape) => Promise<void>;
        return cb(tx);
      });

      await mod.enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.5",
        companyId,
        positionCategory,
        positionDetail: positionDetailRaw,
      });

      expect(tx.reportIpDailyLimit.update).toHaveBeenCalledTimes(1);
      expect(tx.reportIpDailyLimit.update).toHaveBeenCalledWith({
        where: { id: "daily-1" },
        data: { count: { increment: 1 } },
      });
    });

    it("per-company limit exceeded throws company-position-limit", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce({
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: 0,
      } satisfies DailyRow);
      tx.reportIpDailyLimit.update.mockResolvedValueOnce(undefined);

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
        "You have reached the maximum number of reports for this company from this IP address.",
      );

      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("duplicate company+position (P2002 on create) throws company-position-limit with duplicate message", async () => {
      const { mod, errorMod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce({
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: 0,
      } satisfies DailyRow);
      tx.reportIpDailyLimit.update.mockResolvedValueOnce(undefined);

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
        "You have already submitted a report for this position at this company from this IP address.",
      );

      expect(logWarnMock).toHaveBeenCalledTimes(1);
    });

    it("unexpected error on company/position create logs and rethrows", async () => {
      const { mod } = await loadRateLimit();

      const tx = makeTx();

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce({
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: 0,
      } satisfies DailyRow);
      tx.reportIpDailyLimit.update.mockResolvedValueOnce(undefined);

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

      tx.reportIpDailyLimit.findUnique.mockResolvedValueOnce({
        id: "daily-1",
        ipHash: "x",
        day: dayKey,
        count: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
      } satisfies DailyRow);

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
