// tests/unit/api.companies.search.route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type PrismaCompanyFindManyArgs = {
  where: {
    name: {
      startsWith: string;
      mode: "insensitive";
    };
  };
  orderBy: Array<{ name?: "asc"; id?: "asc" }>;
  take: number;
  select: { id: true; name: true; country: true };
};

type PrismaMock = {
  company: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mocks = vi.hoisted(() => {
  const prismaMock: PrismaMock = {
    company: {
      findMany: vi.fn(),
    },
  };

  return {
    prismaMock,
    logErrorMock: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: mocks.prismaMock,
}));

vi.mock("@/lib/logger", () => ({
  logError: mocks.logErrorMock,
}));

import { GET } from "@/app/api/companies/search/route";

/**
 * Builds a NextRequest for the companies search endpoint.
 *
 * @param url - Full request URL.
 * @returns A NextRequest instance.
 */
function makeReq(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/companies/search", () => {
  beforeEach(() => {
    vi.mocked(mocks.prismaMock.company.findMany).mockReset();
    vi.mocked(mocks.logErrorMock).mockReset();
  });

  it("returns [] when q is missing and does not hit the DB", async () => {
    const req = makeReq("http://localhost:3000/api/companies/search");

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(mocks.prismaMock.company.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when q is empty/whitespace and does not hit the DB", async () => {
    const req = makeReq(
      "http://localhost:3000/api/companies/search?q=%20%20%20",
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(mocks.prismaMock.company.findMany).not.toHaveBeenCalled();
  });

  it("trims q, queries with startsWith insensitive, orders by name asc then id asc, and returns mapped payload", async () => {
    vi.mocked(mocks.prismaMock.company.findMany).mockResolvedValue([
      { id: "c2", name: "Alpha", country: "TR" },
      { id: "c1", name: "Alpha", country: "US" },
    ]);

    const req = makeReq(
      "http://localhost:3000/api/companies/search?q=%20Alp%20",
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: "c2", name: "Alpha", country: "TR" },
      { id: "c1", name: "Alpha", country: "US" },
    ]);

    expect(mocks.prismaMock.company.findMany).toHaveBeenCalledTimes(1);

    const args = mocks.prismaMock.company.findMany.mock
      .calls[0]?.[0] as PrismaCompanyFindManyArgs;

    expect(args.where.name.startsWith).toBe("Alp");
    expect(args.where.name.mode).toBe("insensitive");
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
  });

  it("returns 500 JSON on unexpected DB error and logs it", async () => {
    vi.mocked(mocks.prismaMock.company.findMany).mockRejectedValue(
      new Error("db-down"),
    );

    const req = makeReq("http://localhost:3000/api/companies/search?q=Ac");

    const res = await GET(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    expect(mocks.logErrorMock).toHaveBeenCalledTimes(1);
  });
});
