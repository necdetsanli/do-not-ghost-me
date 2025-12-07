//tests/integration/api.reports.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Hoisted mocks for the public reports API:
 * - `getClientIp` from lib/ip
 * - `findOrCreateCompanyForReport` from lib/company
 * - `enforceReportLimitForIpCompanyPosition` from lib/rateLimit
 * - Prisma `report.create`
 */
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

/**
 * Minimal NextRequest-like object for the JSON-based reports API.
 * Only `json()` and `url` are used.
 */
function createJsonRequest(
  body: unknown,
  url = "https://example.test/api/reports",
): NextRequest {
  return {
    url,
    json: async () => body,
  } as unknown as NextRequest;
}

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: IP present and valid unless overridden in a test.
    getClientIpMock.mockReturnValue("203.0.113.42");
  });

  it("returns 400 when payload fails validation", async () => {
    const invalidBody = { foo: "bar" };

    const req = createJsonRequest(invalidBody);

    const res = await POST(req);

    expect(res.status).toBe(400);

    const body = (await res.json()) as { error?: string; details?: unknown };
    expect(body.error).toBe("Invalid input");

    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("creates a report and returns 201 on the happy path", async () => {
    findOrCreateCompanyForReportMock.mockResolvedValue({
      id: "company-1",
    });

    enforceReportLimitForIpCompanyPositionMock.mockResolvedValue(undefined);

    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    prismaReportCreateMock.mockResolvedValue({
      id: "report-1",
      createdAt,
    });

    const validBody = {
      companyName: "Happy Path Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Junior Backend Developer",
      daysWithoutReply: 30,
      country: "DE",
      honeypot: "",
    };

    const req = createJsonRequest(validBody);

    const res = await POST(req);

    expect(res.status).toBe(201);

    const body = (await res.json()) as { id?: string; createdAt?: string };

    expect(body.id).toBe("report-1");
    expect(typeof body.createdAt).toBe("string");

    expect(findOrCreateCompanyForReportMock).toHaveBeenCalledWith({
      companyName: "Happy Path Corp",
    });

    expect(enforceReportLimitForIpCompanyPositionMock).toHaveBeenCalledTimes(1);
    expect(prismaReportCreateMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when client IP is missing", async () => {
    getClientIpMock.mockReturnValue(null);

    const validBody = {
      companyName: "No IP Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Backend Dev",
      daysWithoutReply: 15,
      country: "DE",
      honeypot: "",
    };

    const req = createJsonRequest(validBody);

    const res = await POST(req);

    expect(res.status).toBe(429);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/could not determine your ip/i);

    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("returns 204 and skips persistence when honeypot field is filled", async () => {
    const botBody = {
      companyName: "Bot Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Bot Dev",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "I am a bot",
    };

    const req = createJsonRequest(botBody);

    const res = await POST(req);

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");

    expect(findOrCreateCompanyForReportMock).not.toHaveBeenCalled();
    expect(enforceReportLimitForIpCompanyPositionMock).not.toHaveBeenCalled();
    expect(prismaReportCreateMock).not.toHaveBeenCalled();
  });

  it("maps rate-limit errors from the rate limiter to 429 responses", async () => {
    findOrCreateCompanyForReportMock.mockResolvedValue({
      id: "company-rl",
    });

    const rateLimitError = new ReportRateLimitError(
      "Too many reports from this IP",
      "daily-ip-limit",
    );

    enforceReportLimitForIpCompanyPositionMock.mockRejectedValue(
      rateLimitError,
    );

    const body = {
      companyName: "Rate Limited Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Backend Dev",
      daysWithoutReply: 20,
      country: "DE",
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
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: "SOFTWARE_ENGINEERING",
      positionDetail: "Backend Dev",
      daysWithoutReply: 5,
      country: "DE",
      honeypot: "",
    };

    const req = createJsonRequest(body);

    const res = await POST(req);

    expect(res.status).toBe(500);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Internal server error");
  });
});
