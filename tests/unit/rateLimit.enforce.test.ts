import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PositionCategory } from "@prisma/client";
import { enforceReportLimitForIpCompanyPosition } from "@/lib/rateLimit";
import { prisma } from "@/lib/db";
import { env } from "@/env";

/**
 * Minimal subset of the Prisma client that is used by the rate-limit module.
 * We only mock the pieces we actually touch in the tests.
 */
type Tx = {
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

type PrismaWithTransaction = {
  $transaction: ReturnType<typeof vi.fn>;
};

const SAMPLE_COMPANY_ID = "company-1";
const SAMPLE_CATEGORY = "DEVOPS_SRE_PLATFORM" as PositionCategory;
const SAMPLE_POSITION = "DevOps Engineer";

let txMock: Tx;
let prismaMock: PrismaWithTransaction;

describe("enforceReportLimitForIpCompanyPosition", () => {
  beforeEach(() => {
    txMock = {
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

    // Cast to a writable shape so we can override $transaction in tests.
    prismaMock = prisma as unknown as PrismaWithTransaction;

    prismaMock.$transaction = vi.fn(async (cb: (tx: Tx) => unknown) =>
      cb(txMock),
    ) as unknown as PrismaWithTransaction["$transaction"];
  });

  it("throws a ReportRateLimitError when IP is null", async () => {
    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: null,
        companyId: SAMPLE_COMPANY_ID,
        positionCategory: SAMPLE_CATEGORY,
        positionDetail: SAMPLE_POSITION,
      }),
    ).rejects.toMatchObject({
      name: "ReportRateLimitError",
      reason: "missing-ip",
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('treats the string "unknown" as missing IP', async () => {
    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "unknown",
        companyId: SAMPLE_COMPANY_ID,
        positionCategory: SAMPLE_CATEGORY,
        positionDetail: SAMPLE_POSITION,
      }),
    ).rejects.toMatchObject({
      name: "ReportRateLimitError",
      reason: "missing-ip",
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates daily and company records on the first valid call", async () => {
    txMock.reportIpDailyLimit.findUnique.mockResolvedValue(null);
    txMock.reportIpCompanyLimit.count.mockResolvedValue(0);

    await enforceReportLimitForIpCompanyPosition({
      ip: "203.0.113.42",
      companyId: SAMPLE_COMPANY_ID,
      positionCategory: SAMPLE_CATEGORY,
      positionDetail: SAMPLE_POSITION,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.reportIpDailyLimit.findUnique).toHaveBeenCalledTimes(1);
    expect(txMock.reportIpDailyLimit.create).toHaveBeenCalledTimes(1);
    expect(txMock.reportIpCompanyLimit.count).toHaveBeenCalledTimes(1);
    expect(txMock.reportIpCompanyLimit.create).toHaveBeenCalledTimes(1);
  });

  it("throws when per-day IP limit is exceeded", async () => {
    txMock.reportIpDailyLimit.findUnique.mockResolvedValue({
      id: "daily-1",
      ipHash: "hash",
      day: "2025-01-01",
      count: env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
    });

    txMock.reportIpCompanyLimit.count.mockResolvedValue(0);

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.42",
        companyId: SAMPLE_COMPANY_ID,
        positionCategory: SAMPLE_CATEGORY,
        positionDetail: SAMPLE_POSITION,
      }),
    ).rejects.toMatchObject({
      name: "ReportRateLimitError",
      reason: "daily-ip-limit",
    });
  });

  it("throws when per-company limit is exceeded for this IP", async () => {
    txMock.reportIpDailyLimit.findUnique.mockResolvedValue({
      id: "daily-1",
      ipHash: "hash",
      day: "2025-01-01",
      count: 0,
    });

    txMock.reportIpCompanyLimit.count.mockResolvedValue(
      env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
    );

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.42",
        companyId: SAMPLE_COMPANY_ID,
        positionCategory: SAMPLE_CATEGORY,
        positionDetail: SAMPLE_POSITION,
      }),
    ).rejects.toMatchObject({
      name: "ReportRateLimitError",
      reason: "company-position-limit",
    });
  });

  it("throws when the same position is reported twice for the same IP and company", async () => {
    txMock.reportIpDailyLimit.findUnique.mockResolvedValue(null);
    txMock.reportIpCompanyLimit.count.mockResolvedValue(0);

    txMock.reportIpCompanyLimit.create.mockRejectedValueOnce({
      code: "P2002",
    });

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.42",
        companyId: SAMPLE_COMPANY_ID,
        positionCategory: SAMPLE_CATEGORY,
        positionDetail: SAMPLE_POSITION,
      }),
    ).rejects.toMatchObject({
      name: "ReportRateLimitError",
      reason: "company-position-limit",
    });
  });

  it("rethrows unknown errors from the transaction", async () => {
    txMock.reportIpDailyLimit.findUnique.mockResolvedValue(null);
    txMock.reportIpCompanyLimit.count.mockResolvedValue(0);

    txMock.reportIpCompanyLimit.create.mockRejectedValueOnce(
      new Error("unexpected failure"),
    );

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.42",
        companyId: SAMPLE_COMPANY_ID,
        positionCategory: SAMPLE_CATEGORY,
        positionDetail: SAMPLE_POSITION,
      }),
    ).rejects.toThrow("unexpected failure");
  });
});
