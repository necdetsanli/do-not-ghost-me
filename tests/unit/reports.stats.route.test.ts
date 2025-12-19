// tests/unit/reports.stats.route.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, logErrorMock, logWarnMock, getUtcWeekStartMock } = vi.hoisted(() => ({
  prismaMock: {
    report: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    company: {
      findMany: vi.fn(),
    },
  },
  logErrorMock: vi.fn(),
  logWarnMock: vi.fn(),
  getUtcWeekStartMock: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: HeadersInit }) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        ...(init?.headers !== undefined ? { headers: init.headers } : {}),
      });
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/logger", () => ({
  logError: logErrorMock,
  logWarn: logWarnMock,
}));

vi.mock("@/lib/errorUtils", () => ({
  formatUnknownError: (err: unknown) => String(err),
}));

vi.mock("@/lib/dates", () => ({
  getUtcWeekStart: getUtcWeekStartMock,
}));

type GroupByRow = {
  companyId: string;
  _count: { companyId: number };
};

type JsonResponse = {
  totalReports?: number;
  mostReportedCompany?: { name: string; reportCount: number } | null;
  error?: string;
};

async function importGet(): Promise<() => Promise<Response>> {
  vi.resetModules();
  const mod = await import("@/app/api/reports/stats/route");
  return mod.GET as unknown as () => Promise<Response>;
}

async function readJson(res: Response): Promise<JsonResponse> {
  const txt = await res.text();
  return JSON.parse(txt) as JsonResponse;
}

describe("GET /api/reports/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Deterministic week window
    getUtcWeekStartMock.mockReturnValue(new Date(Date.UTC(2025, 0, 6, 0, 0, 0)));

    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.report.groupBy.mockResolvedValue([]);
    prismaMock.company.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with mostReportedCompany=null when there are no weekly groups (covers candidates.length===0)", async () => {
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.report.groupBy.mockResolvedValue([] as GroupByRow[]);

    const GET = await importGet();
    const res = await GET();

    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.totalReports).toBe(0);
    expect(body.mostReportedCompany).toBeNull();

    expect(prismaMock.company.findMany).toHaveBeenCalledTimes(0);

    // Also validates the createdAt window is computed (addDaysUtc executed)
    const groupByArg = prismaMock.report.groupBy.mock.calls[0]?.[0] as {
      where?: { createdAt?: { gte?: Date; lt?: Date } };
    };
    const gte = groupByArg.where?.createdAt?.gte;
    const lt = groupByArg.where?.createdAt?.lt;

    expect(gte instanceof Date).toBe(true);
    expect(lt instanceof Date).toBe(true);

    if (gte instanceof Date && lt instanceof Date) {
      expect(gte.getTime()).toBe(Date.UTC(2025, 0, 6, 0, 0, 0));
      expect(lt.getTime()).toBe(Date.UTC(2025, 0, 13, 0, 0, 0));
    }
  });

  it("picks deterministically by name asc (case-insensitive) when counts tie", async () => {
    prismaMock.report.count.mockResolvedValue(99);

    prismaMock.report.groupBy.mockResolvedValue([
      { companyId: "b", _count: { companyId: 3 } },
      { companyId: "a", _count: { companyId: 3 } },
    ] as GroupByRow[]);

    prismaMock.company.findMany.mockResolvedValue([
      { id: "a", name: "Alpha" },
      { id: "b", name: "beta" },
    ]);

    const GET = await importGet();
    const res = await GET();

    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.totalReports).toBe(99);
    expect(body.mostReportedCompany).toEqual({ name: "Alpha", reportCount: 3 });
  });

  it("picks deterministically by companyId asc when counts tie AND names tie", async () => {
    prismaMock.report.count.mockResolvedValue(5);

    prismaMock.report.groupBy.mockResolvedValue([
      { companyId: "b", _count: { companyId: 2 } },
      { companyId: "a", _count: { companyId: 2 } },
    ] as GroupByRow[]);

    prismaMock.company.findMany.mockResolvedValue([
      { id: "a", name: "Acme" },
      { id: "b", name: "Acme" },
    ]);

    const GET = await importGet();
    const res = await GET();

    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.mostReportedCompany).toEqual({ name: "Acme", reportCount: 2 });
  });

  it("logs a warning and returns mostReportedCompany=null when tied companies cannot be resolved to valid names (covers logWarn branch)", async () => {
    prismaMock.report.count.mockResolvedValue(7);

    prismaMock.report.groupBy.mockResolvedValue([
      { companyId: "x", _count: { companyId: 4 } },
      { companyId: "y", _count: { companyId: 4 } },
    ] as GroupByRow[]);

    // Missing / empty names => resolved becomes empty
    prismaMock.company.findMany.mockResolvedValue([
      { id: "x", name: "   " },
      { id: "y", name: "" },
    ]);

    const GET = await importGet();
    const res = await GET();

    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.totalReports).toBe(7);
    expect(body.mostReportedCompany).toBeNull();

    expect(logWarnMock).toHaveBeenCalledTimes(1);

    const [msg, meta] = logWarnMock.mock.calls[0] ?? [];
    expect(String(msg)).toContain("No company records found for top groups");

    expect(meta).toEqual(
      expect.objectContaining({
        companyIds: ["x", "y"],
        maxCount: 4,
      }),
    );
  });

  it("returns 500 and logs error when prisma throws (covers catch)", async () => {
    prismaMock.report.count.mockRejectedValue(new Error("db-down"));

    const GET = await importGet();
    const res = await GET();

    expect(res.status).toBe(500);

    const body = await readJson(res);
    expect(body.error).toBe("Internal server error");

    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });
});
