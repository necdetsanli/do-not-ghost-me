// tests/unit/reports.stats.route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { ReportStatus } from "@prisma/client";

const {
  reportCountMock,
  reportGroupByMock,
  companyFindUniqueMock,
  logInfoMock,
  logErrorMock,
} = vi.hoisted(() => ({
  reportCountMock: vi.fn(),
  reportGroupByMock: vi.fn(),
  companyFindUniqueMock: vi.fn(),
  logInfoMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    report: {
      count: reportCountMock,
      groupBy: reportGroupByMock,
    },
    company: {
      findUnique: companyFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logInfo: logInfoMock,
  logError: logErrorMock,
}));

vi.mock("@/lib/errorUtils", () => ({
  formatUnknownError: (e: unknown) => String(e),
}));

/**
 * Creates a minimal NextRequest-like object for API route testing.
 *
 * @param url - Request URL.
 * @returns A mocked NextRequest object.
 */
function makeReq(
  url: string = "https://example.test/api/reports/stats",
): NextRequest {
  return {
    method: "GET",
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/reports/stats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));

    reportCountMock.mockReset();
    reportGroupByMock.mockReset();
    companyFindUniqueMock.mockReset();
    logInfoMock.mockReset();
    logErrorMock.mockReset();
  });

  it("returns totalReports and mostReportedCompany when data exists", async () => {
    reportCountMock.mockResolvedValue(123);

    reportGroupByMock.mockResolvedValue([
      { companyId: "c1", _count: { companyId: 7 } },
    ]);

    companyFindUniqueMock.mockResolvedValue({ name: "Acme" });

    const { GET } = await import("@/app/api/reports/stats/route");

    const res = await GET(makeReq("https://example.test/api/reports/stats"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as unknown;
    expect(body).toEqual({
      totalReports: 123,
      mostReportedCompany: { name: "Acme", reportCount: 7 },
    });

    expect(reportCountMock).toHaveBeenCalledWith({
      where: { status: ReportStatus.ACTIVE },
    });

    expect(reportGroupByMock).toHaveBeenCalledTimes(1);
    expect(companyFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { name: true },
    });
  });

  it("returns mostReportedCompany = null when no weekly groups exist", async () => {
    reportCountMock.mockResolvedValue(0);
    reportGroupByMock.mockResolvedValue([]);

    const { GET } = await import("@/app/api/reports/stats/route");

    const res = await GET(makeReq("https://example.test/api/reports/stats"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      totalReports: number;
      mostReportedCompany: unknown;
    };
    expect(body.totalReports).toBe(0);
    expect(body.mostReportedCompany).toBeNull();

    expect(companyFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns mostReportedCompany = null when top company row is missing", async () => {
    reportCountMock.mockResolvedValue(10);
    reportGroupByMock.mockResolvedValue([
      { companyId: "missing", _count: { companyId: 2 } },
    ]);
    companyFindUniqueMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/reports/stats/route");

    const res = await GET(makeReq("https://example.test/api/reports/stats"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { mostReportedCompany: unknown };
    expect(body.mostReportedCompany).toBeNull();
  });

  it("returns 500 on unexpected error", async () => {
    reportCountMock.mockRejectedValue(new Error("db down"));

    const { GET } = await import("@/app/api/reports/stats/route");

    const res = await GET(makeReq("https://example.test/api/reports/stats"));
    expect(res.status).toBe(500);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Internal server error");
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });
});
