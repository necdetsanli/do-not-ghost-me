// tests/unit/api.companies.search.route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UUID_V4_REGEX } from "@/lib/validation/patterns";

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
    applyPublicRateLimitMock: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: mocks.prismaMock,
}));

vi.mock("@/lib/logger", () => ({
  logError: mocks.logErrorMock,
}));

vi.mock("@/lib/publicRateLimit", () => ({
  applyPublicRateLimit: mocks.applyPublicRateLimitMock,
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
    vi.mocked(mocks.applyPublicRateLimitMock).mockReset();

    // Default: rate limiting passes
    mocks.applyPublicRateLimitMock.mockReturnValue({ allowed: true, clientIp: "192.0.2.1" });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when client IP is null (fail-closed)", async () => {
      mocks.applyPublicRateLimitMock.mockReturnValue({
        allowed: false,
        response: new Response(JSON.stringify({ error: "Rate limit unavailable" }), {
          status: 429,
          headers: { "Cache-Control": "no-store" },
        }),
      });

      const req = makeReq("http://localhost:3000/api/companies/search?q=Test");

      const res = await GET(req);

      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ error: "Rate limit unavailable" });
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(mocks.prismaMock.company.findMany).not.toHaveBeenCalled();
    });

    it("returns 429 when rate limit is exceeded", async () => {
      mocks.applyPublicRateLimitMock.mockReturnValue({
        allowed: false,
        response: new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { "Cache-Control": "no-store" },
        }),
      });

      const req = makeReq("http://localhost:3000/api/companies/search?q=Test");

      const res = await GET(req);

      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ error: "Too many requests" });
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(mocks.prismaMock.company.findMany).not.toHaveBeenCalled();
    });

    it("returns 500 and logs when rate limit throws unexpected error", async () => {
      mocks.applyPublicRateLimitMock.mockReturnValue({
        allowed: false,
        response: new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }),
      });

      const req = makeReq("http://localhost:3000/api/companies/search?q=Test");

      const res = await GET(req);

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Internal server error" });
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(mocks.prismaMock.company.findMany).not.toHaveBeenCalled();
    });

    it("calls applyPublicRateLimit with correct scope and limits", async () => {
      mocks.prismaMock.company.findMany.mockResolvedValue([]);

      const req = makeReq("http://localhost:3000/api/companies/search?q=Test");

      await GET(req);

      expect(mocks.applyPublicRateLimitMock).toHaveBeenCalledTimes(1);
      expect(mocks.applyPublicRateLimitMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          scope: "company-search",
          maxRequests: 60,
          windowMs: 60_000,
          logContext: "[GET /api/companies/search]",
        }),
      );
    });
  });

  describe("Search Behavior", () => {
    it("returns [] when q is missing and does not hit the DB", async () => {
      const req = makeReq("http://localhost:3000/api/companies/search");

      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
      expect(mocks.prismaMock.company.findMany).not.toHaveBeenCalled();
    });

    it("returns [] when q is empty/whitespace and does not hit the DB", async () => {
      const req = makeReq("http://localhost:3000/api/companies/search?q=%20%20%20");

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

      const req = makeReq("http://localhost:3000/api/companies/search?q=%20Alp%20");

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
      vi.mocked(mocks.prismaMock.company.findMany).mockRejectedValue(new Error("db-down"));

      const req = makeReq("http://localhost:3000/api/companies/search?q=Ac");

      const res = await GET(req);

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Internal server error" });
      expect(mocks.logErrorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("correlation id header", () => {
    beforeEach(() => {
      mocks.prismaMock.company.findMany.mockResolvedValue([]);
    });

    it("generates correlation id when header is missing", async () => {
      const req = makeReq("http://localhost:3000/api/companies/search?q=Test");
      const res = await GET(req);
      const header = res.headers.get("x-correlation-id");
      expect(header).not.toBeNull();
      expect(UUID_V4_REGEX.test(header as string)).toBe(true);
    });

    it("echoes valid incoming correlation id (lowercased)", async () => {
      const incoming = "123E4567-E89B-42D3-A456-426614174000";
      const req = new NextRequest("http://localhost:3000/api/companies/search?q=Test", {
        method: "GET",
        headers: {
          "x-correlation-id": incoming,
        },
      });
      const res = await GET(req);
      expect(res.headers.get("x-correlation-id")).toBe(incoming.toLowerCase());
    });

    it("replaces invalid correlation id values with a new UUIDv4", async () => {
      const invalidValues = [
        "",
        "not-a-uuid",
        "123e4567-e89b-12d3-a456-426614174000", // wrong version
        "123e4567-e89b-42d3-6456-426614174000", // wrong variant
        "123e4567-e89b-42d3-a456-426614174000,123",
        " 123e4567-e89b-42d3-a456-426614174000 ",
      ];

      for (const invalid of invalidValues) {
        const req = new NextRequest("http://localhost:3000/api/companies/search?q=Test", {
          method: "GET",
          headers: { "x-correlation-id": invalid },
        });
        const res = await GET(req);
        const header = res.headers.get("x-correlation-id");
        expect(header).not.toBeNull();
        expect(header).not.toBe(invalid.toLowerCase());
        expect(UUID_V4_REGEX.test(header as string)).toBe(true);
      }
    });
  });
});
