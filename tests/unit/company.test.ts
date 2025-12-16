// tests/unit/company.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CountryCode } from "@prisma/client";

const {
  prismaCompanyFindUniqueMock,
  prismaCompanyCreateMock,
  normalizeCompanyNameMock,
  isPrismaUniqueViolationMock,
  logInfoMock,
  logWarnMock,
  logErrorMock,
} = vi.hoisted(() => ({
  prismaCompanyFindUniqueMock: vi.fn(),
  prismaCompanyCreateMock: vi.fn(),
  normalizeCompanyNameMock: vi.fn(),
  isPrismaUniqueViolationMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findUnique: prismaCompanyFindUniqueMock,
      create: prismaCompanyCreateMock,
    },
  },
}));

vi.mock("@/lib/normalization", () => ({
  normalizeCompanyName: normalizeCompanyNameMock,
}));

vi.mock("@/lib/prismaErrors", () => ({
  isPrismaUniqueViolation: isPrismaUniqueViolationMock,
}));

vi.mock("@/lib/logger", () => ({
  logInfo: logInfoMock,
  logWarn: logWarnMock,
  logError: logErrorMock,
}));

import { findOrCreateCompanyForReport } from "@/lib/company";

type CompanyForReportShape = Awaited<
  ReturnType<typeof findOrCreateCompanyForReport>
>;

function makeCompany(args: {
  id?: string;
  name: string;
  normalizedName: string;
  country: CountryCode;
}): CompanyForReportShape {
  return {
    id: args.id ?? "company-1",
    name: args.name,
    normalizedName: args.normalizedName,
    country: args.country,
  };
}

describe("findOrCreateCompanyForReport", () => {
  const country = "DE" as unknown as CountryCode;

  beforeEach(() => {
    vi.clearAllMocks();

    prismaCompanyFindUniqueMock.mockReset();
    prismaCompanyCreateMock.mockReset();
    normalizeCompanyNameMock.mockReset();
    isPrismaUniqueViolationMock.mockReset();

    logInfoMock.mockReset();
    logWarnMock.mockReset();
    logErrorMock.mockReset();
  });

  it("throws when normalized company name is empty", async () => {
    normalizeCompanyNameMock.mockReturnValue("");

    const call = findOrCreateCompanyForReport({
      companyName: "  Acme  ",
      country,
    });

    await expect(call).rejects.toThrow(
      "Company name must not be empty after normalization.",
    );

    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(prismaCompanyFindUniqueMock).not.toHaveBeenCalled();
    expect(prismaCompanyCreateMock).not.toHaveBeenCalled();
  });

  it("reuses an existing company by (normalizedName, country)", async () => {
    normalizeCompanyNameMock.mockReturnValue("acme");
    const existing = makeCompany({
      id: "company-existing",
      name: "Acme",
      normalizedName: "acme",
      country,
    });

    prismaCompanyFindUniqueMock.mockResolvedValue(existing);

    const result = await findOrCreateCompanyForReport({
      companyName: "Acme",
      country,
    });

    expect(result).toEqual(existing);

    expect(prismaCompanyFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(prismaCompanyFindUniqueMock).toHaveBeenCalledWith({
      where: {
        uniq_company_name_country: {
          normalizedName: "acme",
          country,
        },
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        country: true,
      },
    });

    expect(prismaCompanyCreateMock).not.toHaveBeenCalled();
    expect(logInfoMock).not.toHaveBeenCalled();
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("creates a new company when none exists", async () => {
    normalizeCompanyNameMock.mockReturnValue("acme");
    prismaCompanyFindUniqueMock.mockResolvedValue(null);

    const created = makeCompany({
      id: "company-created",
      name: "Acme",
      normalizedName: "acme",
      country,
    });

    prismaCompanyCreateMock.mockResolvedValue(created);

    const result = await findOrCreateCompanyForReport({
      companyName: "   Acme   ",
      country,
    });

    expect(result).toEqual(created);

    expect(prismaCompanyFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(prismaCompanyCreateMock).toHaveBeenCalledTimes(1);
    expect(prismaCompanyCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Acme",
        normalizedName: "acme",
        country,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        country: true,
      },
    });

    expect(logInfoMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).not.toHaveBeenCalled();
    expect(logErrorMock).not.toHaveBeenCalled();
  });

  it("handles a concurrent create race by re-reading on unique violation", async () => {
    normalizeCompanyNameMock.mockReturnValue("acme");
    prismaCompanyFindUniqueMock.mockResolvedValueOnce(null);

    const p2002 = new Error("P2002");
    prismaCompanyCreateMock.mockRejectedValueOnce(p2002);
    isPrismaUniqueViolationMock.mockReturnValue(true);

    const concurrent = makeCompany({
      id: "company-concurrent",
      name: "Acme",
      normalizedName: "acme",
      country,
    });

    prismaCompanyFindUniqueMock.mockResolvedValueOnce(concurrent);

    const result = await findOrCreateCompanyForReport({
      companyName: "Acme",
      country,
    });

    expect(result).toEqual(concurrent);

    expect(prismaCompanyFindUniqueMock).toHaveBeenCalledTimes(2);
    expect(prismaCompanyCreateMock).toHaveBeenCalledTimes(1);

    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock).not.toHaveBeenCalled();
  });

  it("rethrows when unique violation occurs but the row is still missing after retry", async () => {
    normalizeCompanyNameMock.mockReturnValue("acme");
    prismaCompanyFindUniqueMock.mockResolvedValueOnce(null);

    const p2002 = new Error("P2002");
    prismaCompanyCreateMock.mockRejectedValueOnce(p2002);
    isPrismaUniqueViolationMock.mockReturnValue(true);

    prismaCompanyFindUniqueMock.mockResolvedValueOnce(null);

    const call = findOrCreateCompanyForReport({
      companyName: "Acme",
      country,
    });

    await expect(call).rejects.toBe(p2002);

    expect(prismaCompanyFindUniqueMock).toHaveBeenCalledTimes(2);
    expect(prismaCompanyCreateMock).toHaveBeenCalledTimes(1);

    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("logs and rethrows non-unique database errors", async () => {
    normalizeCompanyNameMock.mockReturnValue("acme");
    prismaCompanyFindUniqueMock.mockResolvedValue(null);

    const dbError = new Error("db failure");
    prismaCompanyCreateMock.mockRejectedValueOnce(dbError);
    isPrismaUniqueViolationMock.mockReturnValue(false);

    const call = findOrCreateCompanyForReport({
      companyName: "Acme",
      country,
    });

    await expect(call).rejects.toBe(dbError);

    expect(prismaCompanyFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(prismaCompanyCreateMock).toHaveBeenCalledTimes(1);

    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).not.toHaveBeenCalled();
  });
});
