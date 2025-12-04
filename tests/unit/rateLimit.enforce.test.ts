// tests/unit/rateLimit.enforce.test.ts
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";

// Create a mock for the Prisma client used in "@/lib/db".
const prismaMock = {
  $transaction: vi.fn(),
};

// Mock "@/lib/db" BEFORE importing the module under test.
vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

// We will import the functions under test lazily after the mock above.
let enforceReportLimitForIpCompanyPosition: any;
let ReportRateLimitError: any;

type TxMock = {
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

const createTxMock = (): TxMock => ({
  reportIpDailyLimit: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  reportIpCompanyLimit: {
    count: vi.fn(),
    create: vi.fn(),
  },
});

const ORIGINAL_ENV = { ...process.env };

beforeAll(async () => {
  const mod = await import("@/lib/rateLimit");

  enforceReportLimitForIpCompanyPosition =
    mod.enforceReportLimitForIpCompanyPosition;
  ReportRateLimitError = mod.ReportRateLimitError;
});

describe("enforceReportLimitForIpCompanyPosition", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };

    process.env.RATE_LIMIT_IP_SALT = "test-only-rate-limit-ip-salt-change-me";
    process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "3";
    process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "5";

    prismaMock.$transaction.mockReset();
  });

  it("skips all checks when IP is empty", async () => {
    await enforceReportLimitForIpCompanyPosition({
      ip: "",
      companyId: "company-1",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Backend Engineer",
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('skips all checks when IP is "unknown"', async () => {
    await enforceReportLimitForIpCompanyPosition({
      ip: "unknown",
      companyId: "company-1",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Backend Engineer",
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates daily and company records on first valid call", async () => {
    const tx = createTxMock();

    tx.reportIpDailyLimit.findUnique.mockResolvedValue(null);
    tx.reportIpDailyLimit.create.mockResolvedValue({});
    tx.reportIpCompanyLimit.count.mockResolvedValue(0);
    tx.reportIpCompanyLimit.create.mockResolvedValue({});

    prismaMock.$transaction.mockImplementation(
      async (cb: (t: TxMock) => unknown) => cb(tx),
    );

    await enforceReportLimitForIpCompanyPosition({
      ip: "203.0.113.10",
      companyId: "company-1",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Backend Engineer",
    });

    expect(tx.reportIpDailyLimit.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.reportIpDailyLimit.create).toHaveBeenCalledTimes(1);
    expect(tx.reportIpDailyLimit.update).not.toHaveBeenCalled();

    expect(tx.reportIpCompanyLimit.count).toHaveBeenCalledTimes(1);
    expect(tx.reportIpCompanyLimit.create).toHaveBeenCalledTimes(1);
  });

  it("throws when per-day limit is exceeded", async () => {
    const tx = createTxMock();

    tx.reportIpDailyLimit.findUnique.mockResolvedValue({
      id: "daily-1",
      ipHash: "dummy-hash",
      day: "2025-12-04",
      count: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prismaMock.$transaction.mockImplementation(
      async (cb: (t: TxMock) => unknown) => cb(tx),
    );

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.20",
        companyId: "company-2",
        positionCategory: "SOFTWARE_ENGINEERING",
        positionDetail: "Backend Engineer",
      }),
    ).rejects.toEqual(
      new ReportRateLimitError(
        "You have reached the daily report limit from this network.",
      ),
    );

    expect(tx.reportIpCompanyLimit.count).not.toHaveBeenCalled();
    expect(tx.reportIpCompanyLimit.create).not.toHaveBeenCalled();
  });

  it("throws when per-company limit is exceeded for this IP", async () => {
    const tx = createTxMock();

    tx.reportIpDailyLimit.findUnique.mockResolvedValue({
      id: "daily-2",
      ipHash: "dummy-hash",
      day: "2025-12-04",
      count: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tx.reportIpDailyLimit.update.mockResolvedValue({});

    tx.reportIpCompanyLimit.count.mockResolvedValue(3);

    prismaMock.$transaction.mockImplementation(
      async (cb: (t: TxMock) => unknown) => cb(tx),
    );

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.30",
        companyId: "company-3",
        positionCategory: "SOFTWARE_ENGINEERING",
        positionDetail: "Backend Engineer",
      }),
    ).rejects.toEqual(
      new ReportRateLimitError(
        "You have reached the maximum number of reports for this company from this network.",
      ),
    );

    expect(tx.reportIpCompanyLimit.create).not.toHaveBeenCalled();
  });

  it("throws when the same position is reported twice for the same IP + company", async () => {
    const tx = createTxMock();

    tx.reportIpDailyLimit.findUnique.mockResolvedValue({
      id: "daily-3",
      ipHash: "dummy-hash",
      day: "2025-12-04",
      count: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tx.reportIpDailyLimit.update.mockResolvedValue({});
    tx.reportIpCompanyLimit.count.mockResolvedValue(1);

    tx.reportIpCompanyLimit.create.mockRejectedValue({
      code: "P2002",
    });

    prismaMock.$transaction.mockImplementation(
      async (cb: (t: TxMock) => unknown) => cb(tx),
    );

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.40",
        companyId: "company-4",
        positionCategory: "SOFTWARE_ENGINEERING",
        positionDetail: "Backend Engineer",
      }),
    ).rejects.toEqual(
      new ReportRateLimitError(
        "You have already submitted a report for this position at this company from this network.",
      ),
    );
  });

  it("rethrows unknown errors from the transaction", async () => {
    const tx = createTxMock();

    tx.reportIpDailyLimit.findUnique.mockResolvedValue(null);

    prismaMock.$transaction.mockImplementation(async () => {
      throw new Error("unexpected failure");
    });

    await expect(
      enforceReportLimitForIpCompanyPosition({
        ip: "203.0.113.50",
        companyId: "company-5",
        positionCategory: "SOFTWARE_ENGINEERING",
        positionDetail: "Backend Engineer",
      }),
    ).rejects.toThrow("unexpected failure");
  });
});
