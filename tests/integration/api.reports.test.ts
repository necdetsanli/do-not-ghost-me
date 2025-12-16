// tests/integration/api.reports.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  getClientIpMock,
  findOrCreateCompanyForReportMock,
  enforceReportLimitForIpCompanyPositionMock,
  prismaReportCreateMock,
} = vi.hoisted(() => ({
  getClientIpMock: vi.fn(),
  findOrCreateCompanyForReportMock: vi.fn(),
  enforceReportLimitForIpCompanyPositionMock: vi.fn(),
  prismaReportCreateMock: vi.fn(),
}));

vi.mock("@/lib/ip", () => ({
  getClientIp: getClientIpMock,
}));

vi.mock("@/lib/company", () => ({
  findOrCreateCompanyForReport: findOrCreateCompanyForReportMock,
}));

vi.mock("@/lib/rateLimit", () => ({
  enforceReportLimitForIpCompanyPosition:
    enforceReportLimitForIpCompanyPositionMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    report: {
      create: prismaReportCreateMock,
    },
  },
}));

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/reports/route";
import { ReportRateLimitError } from "@/lib/rateLimitError";
import { CountryCode, JobLevel, PositionCategory, Stage } from "@prisma/client";

function createJsonRequest(
  body: unknown,
  url = "https://example.test/api/reports",
  method = "POST",
): NextRequest {
  const pathname = new URL(url).pathname;

  return {
    url,
    method,
    nextUrl: { pathname },
    headers: new Headers(),
    json: async () => body,
  } as unknown as NextRequest;
}

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIpMock.mockReturnValue("203.0.113.42");
  });

  it("returns 400 when payload fails validation", async () => {
    const req = createJsonRequest({ foo: "bar" });

    const res = await POST(req);

    expect(res.status).toBe(400);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid input");

    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("creates a report and returns 200 on the happy path", async () => {
    findOrCreateCompanyForReportMock.mockResolvedValue({ id: "company-1" });
    enforceReportLimitForIpCompanyPositionMock.mockResolvedValue(undefined);

    prismaReportCreateMock.mockResolvedValue({
      id: "report-1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const validBody = {
      companyName: "Happy Path Corp",
      stage: Stage.TECHNICAL,
      jobLevel: JobLevel.JUNIOR,
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "Junior Backend Developer",
      daysWithoutReply: 30,
      country: CountryCode.DE,
      honeypot: "",
    };

    const req = createJsonRequest(validBody);

    const res = await POST(req);

    expect(res.status).toBe(200);

    const body = (await res.json()) as { id?: string; createdAt?: string };
    expect(body.id).toBe("report-1");
    expect(typeof body.createdAt).toBe("string");

    expect(findOrCreateCompanyForReportMock).toHaveBeenCalledWith({
      companyName: "Happy Path Corp",
      country: CountryCode.DE,
    });

    expect(enforceReportLimitForIpCompanyPositionMock).toHaveBeenCalledTimes(1);
    expect(prismaReportCreateMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when client IP is missing", async () => {
    getClientIpMock.mockReturnValue(null);

    const body = {
      companyName: "No IP Corp",
      stage: Stage.TECHNICAL,
      jobLevel: JobLevel.JUNIOR,
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "Backend Dev",
      daysWithoutReply: 15,
      country: CountryCode.DE,
      honeypot: "",
    };

    const req = createJsonRequest(body);

    const res = await POST(req);

    expect(res.status).toBe(429);

    const json = (await res.json()) as { error?: string };
    expect(json.error?.toLowerCase()).toContain("ip");
    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("returns 204 and skips persistence when honeypot field is filled", async () => {
    const botBody = {
      companyName: "Bot Corp",
      stage: Stage.TECHNICAL,
      jobLevel: JobLevel.JUNIOR,
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "Bot Dev",
      daysWithoutReply: 10,
      country: CountryCode.DE,
      honeypot: "I am a bot",
    };

    const req = createJsonRequest(botBody);

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");

    expect(findOrCreateCompanyForReportMock).not.toHaveBeenCalled();
    expect(enforceReportLimitForIpCompanyPositionMock).not.toHaveBeenCalled();
    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("maps rate-limit errors from the rate limiter to 429 responses", async () => {
    findOrCreateCompanyForReportMock.mockResolvedValue({ id: "company-rl" });

    const rateLimitError = new ReportRateLimitError(
      "Too many reports from this IP",
      "daily-ip-limit",
    );

    enforceReportLimitForIpCompanyPositionMock.mockRejectedValue(
      rateLimitError,
    );

    const body = {
      companyName: "Rate Limited Corp",
      stage: Stage.TECHNICAL,
      jobLevel: JobLevel.JUNIOR,
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "Backend Dev",
      daysWithoutReply: 20,
      country: CountryCode.DE,
      honeypot: "",
    };

    const req = createJsonRequest(body);

    const res = await POST(req);

    expect(res.status).toBe(429);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Too many reports from this IP");

    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected errors", async () => {
    findOrCreateCompanyForReportMock.mockRejectedValue(
      new Error("database offline"),
    );

    const body = {
      companyName: "Crash Corp",
      stage: Stage.TECHNICAL,
      jobLevel: JobLevel.JUNIOR,
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "Backend Dev",
      daysWithoutReply: 5,
      country: CountryCode.DE,
      honeypot: "",
    };

    const req = createJsonRequest(body);

    const res = await POST(req);

    expect(res.status).toBe(500);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Internal server error");
  });
});
