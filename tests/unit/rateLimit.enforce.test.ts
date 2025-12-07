//tests/unit/rateLimit.enforce.test.ts
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

/**
 * Narrowed Prisma client shape exposing only the `$transaction` API that
 * `enforceReportLimitForIpCompanyPosition` relies on. This makes it easier
 * to override and inspect in tests.
 */
type PrismaWithTransaction = {
  $transaction: ReturnType<typeof vi.fn>;
};

const SAMPLE_COMPANY_ID = "company-1";
const SAMPLE_CATEGORY = "DEVOPS_SRE_PLATFORM" as PositionCategory;
const SAMPLE_POSITION = "DevOps Engineer";

let txMock: Tx;
let prismaMock: PrismaWithTransaction;

/**
 * Unit tests for `enforceReportLimitForIpCompanyPosition`.
 *
 * These tests verify that:
 * - missing or invalid IPs are rejected before any database access,
 * - counters are created/updated on the happy path,
 * - per-day and per-company limits trigger the correct error,
 * - unique constraint violations map to the expected rate-limit error, and
 * - unexpected errors inside the transaction bubble up unchanged.
 */
describe("enforceReportLimitForIpCompanyPosition", () => {
  /**
   * Re-initialise the Prisma transaction mock and all inner model mocks
   * before each test case so that expectations do not leak between tests.
   */
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

    // Cast to a writable shape so we can override `$transaction` in tests.
    prismaMock = prisma as unknown as PrismaWithTransaction;

    prismaMock.$transaction = vi.fn(async (cb: (tx: Tx) => unknown) =>
      cb(txMock),
    ) as unknown as PrismaWithTransaction["$transaction"];
  });

  /**
   * An explicit `null` IP must be treated as a hard validation error and
   * short-circuit before any transaction is executed.
   */
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

  /**
   * The literal string `"unknown"` is also treated as a missing IP and
   * therefore must not reach the database layer.
   */
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

  /**
   * On the first valid call for a given IP + company + position, the function
   * should:
   * - create a daily counter row, and
   * - create a per-company record,
   * updating both via a single transaction.
   */
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

  /**
   * When the daily report count for a given IP reaches the configured maximum,
   * the function must throw a `ReportRateLimitError` with reason
   * `"daily-ip-limit"`.
   */
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

  /**
   * When the number of reports for a given IP + company reaches the
   * configured maximum, the function must throw a `ReportRateLimitError`
   * with reason `"company-position-limit"`.
   */
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

  /**
   * A unique-constraint violation (Prisma error code `P2002`) when inserting
   * the per-company limit row is treated as if the limit has already been
   * reached for that IP + company + position combination.
   */
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

  /**
   * Any unexpected error thrown inside the transaction (for example from
   * the database driver) must not be swallowed or converted, and should
   * instead bubble up to the caller unchanged.
   */
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
