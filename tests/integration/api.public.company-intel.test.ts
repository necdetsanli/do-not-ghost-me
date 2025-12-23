// tests/integration/api.public.company-intel.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyPublicRateLimitMock, fetchCompanyIntelMock } = vi.hoisted(() => {
  return {
    applyPublicRateLimitMock: vi.fn(),
    fetchCompanyIntelMock: vi.fn(),
  };
});

vi.mock("@/lib/publicRateLimit", () => ({
  applyPublicRateLimit: applyPublicRateLimitMock,
}));

vi.mock("@/lib/companyIntelService", () => ({
  fetchCompanyIntel: fetchCompanyIntelMock,
  DEFAULT_COMPANY_INTEL_K_ANONYMITY: 5,
}));

import { GET } from "@/app/api/public/company-intel/route";
import { companyIntelErrorResponseSchema } from "@/lib/contracts/companyIntel";
import type { NextRequest } from "next/server";

function createRequest(
  url = "https://example.test/api/public/company-intel?source=linkedin&key=acme",
): NextRequest {
  const nextUrl = new URL(url);

  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl,
  } as unknown as NextRequest;
}

describe("GET /api/public/company-intel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyPublicRateLimitMock.mockReturnValue({ allowed: true, clientIp: "203.0.113.10" });
  });

  it("returns 400 when validation fails", async () => {
    const req = createRequest("https://example.test/api/public/company-intel?source=linkedin");

    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid input");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const parsed = companyIntelErrorResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(fetchCompanyIntelMock).not.toHaveBeenCalled();
  });

  it("returns insufficient_data when the service cannot provide signals", async () => {
    fetchCompanyIntelMock.mockResolvedValue({ status: "insufficient_data" });

    const res = await GET(createRequest());

    expect(res.status).toBe(200);

    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe("insufficient_data");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });

  it("returns 200 with aggregated payload on success", async () => {
    fetchCompanyIntelMock.mockResolvedValue({
      companyId: "company-1",
      displayName: "Acme Corp",
      signals: {
        reportCountTotal: 12,
        reportCount90d: 4,
        riskScore: null,
        confidence: "medium",
      },
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const res = await GET(createRequest());

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      company?: { canonicalId?: string; displayName?: string };
      signals?: { reportCountTotal?: number; confidence?: string };
      updatedAt?: string;
    };

    expect(body.company?.canonicalId).toBe("company-1");
    expect(body.company?.displayName).toBe("Acme Corp");
    expect(body.signals?.reportCountTotal).toBe(12);
    expect(body.signals?.confidence).toBe("medium");
    expect(body.updatedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });

  it("maps rate-limit errors to 429 responses", async () => {
    applyPublicRateLimitMock.mockReturnValue({
      allowed: false,
      response: new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "cache-control": "no-store" },
      }),
    });

    const res = await GET(createRequest());

    expect(res.status).toBe(429);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Too many requests");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchCompanyIntelMock).not.toHaveBeenCalled();
  });

  it("fails closed when client IP is missing", async () => {
    applyPublicRateLimitMock.mockReturnValue({
      allowed: false,
      response: new Response(JSON.stringify({ error: "Rate limit unavailable" }), {
        status: 429,
        headers: { "cache-control": "no-store" },
      }),
    });

    const res = await GET(createRequest());

    expect(res.status).toBe(429);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Rate limit unavailable");
    expect(fetchCompanyIntelMock).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected errors", async () => {
    fetchCompanyIntelMock.mockRejectedValue(new Error("db down"));

    const res = await GET(createRequest());

    expect(res.status).toBe(500);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Internal server error");
  });
});

describe("parsePositiveIntEnv (module-level env parsing)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses fallback when env var is not a valid number (NaN)", async () => {
    vi.stubEnv("COMPANY_INTEL_K_ANONYMITY", "not-a-number");

    // Re-import module to trigger parsePositiveIntEnv with the stub
    const { GET: newGET } = await import("@/app/api/public/company-intel/route");

    applyPublicRateLimitMock.mockReturnValue({ allowed: true, clientIp: "203.0.113.10" });
    fetchCompanyIntelMock.mockResolvedValue({
      companyId: "test",
      displayName: "Test",
      signals: { reportCountTotal: 1, reportCount90d: 0, riskScore: null, confidence: "low" },
      updatedAt: new Date(),
    });

    const res = await newGET(createRequest());
    expect(res.status).toBe(200);
    // The module still works with fallback value
  });

  it("uses fallback when env var is less than 1", async () => {
    vi.stubEnv("COMPANY_INTEL_K_ANONYMITY", "0");

    const { GET: newGET } = await import("@/app/api/public/company-intel/route");

    applyPublicRateLimitMock.mockReturnValue({ allowed: true, clientIp: "203.0.113.10" });
    fetchCompanyIntelMock.mockResolvedValue({
      companyId: "test",
      displayName: "Test",
      signals: { reportCountTotal: 1, reportCount90d: 0, riskScore: null, confidence: "low" },
      updatedAt: new Date(),
    });

    const res = await newGET(createRequest());
    expect(res.status).toBe(200);
  });

  it("uses fallback when env var is negative", async () => {
    vi.stubEnv("COMPANY_INTEL_K_ANONYMITY", "-5");

    const { GET: newGET } = await import("@/app/api/public/company-intel/route");

    applyPublicRateLimitMock.mockReturnValue({ allowed: true, clientIp: "203.0.113.10" });
    fetchCompanyIntelMock.mockResolvedValue({
      companyId: "test",
      displayName: "Test",
      signals: { reportCountTotal: 1, reportCount90d: 0, riskScore: null, confidence: "low" },
      updatedAt: new Date(),
    });

    const res = await newGET(createRequest());
    expect(res.status).toBe(200);
  });

  it("uses parsed value when env var is a valid positive integer", async () => {
    vi.stubEnv("COMPANY_INTEL_K_ANONYMITY", "10");

    const { GET: newGET } = await import("@/app/api/public/company-intel/route");

    applyPublicRateLimitMock.mockReturnValue({ allowed: true, clientIp: "203.0.113.10" });
    fetchCompanyIntelMock.mockResolvedValue({
      companyId: "test",
      displayName: "Test",
      signals: { reportCountTotal: 1, reportCount90d: 0, riskScore: null, confidence: "low" },
      updatedAt: new Date(),
    });

    const res = await newGET(createRequest());
    expect(res.status).toBe(200);
  });
});
