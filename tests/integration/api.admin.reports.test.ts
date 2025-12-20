// tests/integration/api.admin.reports.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const { requireAdminRequestMock, prismaReportUpdateMock, prismaReportDeleteMock } = vi.hoisted(
  () => ({
    requireAdminRequestMock: vi.fn(),
    prismaReportUpdateMock: vi.fn(),
    prismaReportDeleteMock: vi.fn(),
  }),
);

vi.mock("@/lib/adminAuth", () => ({
  requireAdminRequest: requireAdminRequestMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    report: {
      update: prismaReportUpdateMock,
      delete: prismaReportDeleteMock,
    },
  },
}));

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/reports/[id]/route";

/**
 * Creates a minimal NextRequest-like object that supports req.formData() for route handler testing.
 *
 * Notes:
 * - Only the members accessed by the handler are implemented.
 * - The returned FormData-like object only implements get(name).
 * - nextUrl.pathname is derived from the provided url to mirror NextRequest behavior.
 *
 * @param fields - Form fields (string values) keyed by field name.
 * @param url - Request URL containing the report id segment.
 * @param method - HTTP method (defaults to POST).
 * @returns NextRequest-like object for integration tests.
 */
function createFormRequest(
  fields: Record<string, string | null>,
  url = "https://example.test/api/admin/reports/report-123",
  method = "POST",
): NextRequest {
  const fakeFormData = {
    get(name: string): FormDataEntryValue | null {
      const value = fields[name];
      return value === undefined ? null : value;
    },
  } as unknown as FormData;

  const pathname = new URL(url).pathname;

  return {
    url,
    method,
    nextUrl: { pathname },
    formData: async () => fakeFormData,
    headers: new Headers(),
  } as unknown as NextRequest;
}

/**
 * The handler context shape for Next.js dynamic routes.
 */
type AdminReportsHandlerContext = Parameters<typeof POST>[1];

/**
 * Creates a minimal handler context with the dynamic report id param.
 *
 * The route handler expects `params` as a Promise resolving to `{ id }`.
 *
 * @param id - Report id for the dynamic route segment.
 * @returns Handler context compatible with POST(req, ctx).
 */
function createContext(id: string): AdminReportsHandlerContext {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("POST /api/admin/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Ensures the handler rejects missing/empty ids with a 400 response and
   * does not touch Prisma.
   */
  it("returns 400 when report id is missing or empty", async () => {
    const req = createFormRequest({ action: "flag" });
    const ctx = createContext("");

    const res = await POST(req, ctx);

    expect(res.status).toBe(400);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Missing or invalid report id");

    expect(prismaReportUpdateMock).not.toHaveBeenCalled();
    expect(prismaReportDeleteMock).not.toHaveBeenCalled();
  });

  /**
   * Ensures "flag" performs a moderation update:
   * - sets status=FLAGGED
   * - persists optional flaggedReason
   * - sets flaggedAt
   * - redirects back to /admin
   */
  it('applies the "flag" action with optional reason and redirects to /admin', async () => {
    prismaReportUpdateMock.mockResolvedValueOnce({ id: "report-1" });

    const req = createFormRequest({
      action: "flag",
      reason: "Spam / abusive content",
    });
    const ctx = createContext("report-1");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    const location = res.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe("/admin");

    expect(requireAdminRequestMock).toHaveBeenCalledTimes(1);
    expect(prismaReportUpdateMock).toHaveBeenCalledTimes(1);

    const updateArg = prismaReportUpdateMock.mock.calls[0]?.[0];
    expect(updateArg.where).toEqual({ id: "report-1" });
    expect(updateArg.data.status).toBe("FLAGGED");
    expect(updateArg.data.flaggedReason).toBe("Spam / abusive content");
    expect(updateArg.data.flaggedAt).toBeInstanceOf(Date);
  });

  /**
   * Ensures "restore" resets moderation metadata and makes the report active again.
   */
  it('applies the "restore" action and clears moderation metadata', async () => {
    prismaReportUpdateMock.mockResolvedValueOnce({ id: "report-2" });

    const req = createFormRequest({ action: "restore" });
    const ctx = createContext("report-2");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    const updateArg = prismaReportUpdateMock.mock.calls[0]?.[0];
    expect(updateArg.where).toEqual({ id: "report-2" });
    expect(updateArg.data.status).toBe("ACTIVE");
    expect(updateArg.data.flaggedAt).toBeNull();
    expect(updateArg.data.flaggedReason).toBeNull();
    expect(updateArg.data.deletedAt).toBeNull();
  });

  /**
   * Ensures "delete" is implemented as a soft delete:
   * - sets status=DELETED
   * - sets deletedAt
   */
  it('applies the "delete" action as a soft delete', async () => {
    prismaReportUpdateMock.mockResolvedValueOnce({ id: "report-3" });

    const req = createFormRequest({ action: "delete" });
    const ctx = createContext("report-3");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    const updateArg = prismaReportUpdateMock.mock.calls[0]?.[0];
    expect(updateArg.where).toEqual({ id: "report-3" });
    expect(updateArg.data.status).toBe("DELETED");
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  /**
   * Ensures "hard-delete" performs an actual Prisma delete and does not call update.
   */
  it('applies the "hard-delete" action via Prisma delete', async () => {
    prismaReportDeleteMock.mockResolvedValueOnce({ id: "report-4" });

    const req = createFormRequest({ action: "hard-delete" });
    const ctx = createContext("report-4");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    expect(prismaReportDeleteMock).toHaveBeenCalledTimes(1);
    expect(prismaReportDeleteMock.mock.calls[0]?.[0]).toEqual({
      where: { id: "report-4" },
    });

    expect(prismaReportUpdateMock).not.toHaveBeenCalled();
  });

  /**
   * Ensures unknown moderation actions are rejected with a 400 response and no DB writes.
   */
  it("returns 400 for an unknown moderation action", async () => {
    const req = createFormRequest({ action: "something-else" });
    const ctx = createContext("report-5");

    const res = await POST(req, ctx);

    expect(res.status).toBe(400);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/Unknown moderation action/i);

    expect(prismaReportUpdateMock).not.toHaveBeenCalled();
    expect(prismaReportDeleteMock).not.toHaveBeenCalled();
  });

  /**
   * Ensures unexpected Prisma/database errors are mapped to a 500 response with a stable message.
   */
  it("returns 500 when Prisma throws an unexpected error", async () => {
    prismaReportUpdateMock.mockRejectedValueOnce(new Error("db failure"));

    const req = createFormRequest({ action: "flag", reason: "Any reason" });
    const ctx = createContext("report-6");

    const res = await POST(req, ctx);

    expect(res.status).toBe(500);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Failed to apply moderation action");
  });
});
