//tests/integration/api.admin.reports.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Hoisted mocks for the admin reports moderation route:
 * - `requireAdminRequest` guard
 * - Prisma `report.update` and `report.delete`
 */
const {
  requireAdminRequestMock,
  prismaReportUpdateMock,
  prismaReportDeleteMock,
} = vi.hoisted(() => ({
  requireAdminRequestMock: vi.fn(),
  prismaReportUpdateMock: vi.fn(),
  prismaReportDeleteMock: vi.fn(),
}));

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
 * Minimal NextRequest-like object for the moderation route.
 * Only `formData()` and `url` are used.
 */
function createFormRequest(
  fields: Record<string, string | null>,
  url = "https://example.test/api/admin/reports/report-123",
): NextRequest {
  const fakeFormData = {
    get(name: string): FormDataEntryValue | null {
      const value = fields[name];
      return value === undefined ? null : value;
    },
  } as unknown as FormData;

  return {
    url,
    formData: async () => fakeFormData,
  } as unknown as NextRequest;
}

/**
 * Actual context type of the handler:
 * second parameter of the POST handler in the route.
 */
type AdminReportsHandlerContext = Parameters<typeof POST>[1];

/**
 * Helper to build the context object passed by Next.js, with a given id.
 * In Next.js 16, `params` is a Promise.
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

  it("returns 400 when report id is missing or empty", async () => {
    const req = createFormRequest({ action: "flag" });
    // Boş id simüle edelim
    const ctx = createContext("");

    const res = await POST(req, ctx);

    expect(res.status).toBe(400);

    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Missing or invalid report id");

    expect(prismaReportUpdateMock).not.toHaveBeenCalled();
    expect(prismaReportDeleteMock).not.toHaveBeenCalled();
  });

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
    const updateCall = prismaReportUpdateMock.mock.calls[0];
    expect(updateCall).toBeDefined();
    const updateArg = updateCall![0];

    expect(updateArg.where).toEqual({ id: "report-1" });
    expect(updateArg.data.status).toBe("FLAGGED");
    expect(updateArg.data.flaggedReason).toBe("Spam / abusive content");
    expect(updateArg.data.flaggedAt).toBeInstanceOf(Date);
  });

  it('applies the "restore" action and clears moderation metadata', async () => {
    prismaReportUpdateMock.mockResolvedValueOnce({ id: "report-2" });

    const req = createFormRequest({ action: "restore" });
    const ctx = createContext("report-2");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    expect(prismaReportUpdateMock).toHaveBeenCalledTimes(1);
    const updateCall = prismaReportUpdateMock.mock.calls[0];
    expect(updateCall).toBeDefined();
    const updateArg = updateCall![0];

    expect(updateArg.where).toEqual({ id: "report-2" });
    expect(updateArg.data.status).toBe("ACTIVE");
    expect(updateArg.data.flaggedAt).toBeNull();
    expect(updateArg.data.flaggedReason).toBeNull();
    expect(updateArg.data.deletedAt).toBeNull();
  });

  it('applies the "delete" action as a soft delete', async () => {
    prismaReportUpdateMock.mockResolvedValueOnce({ id: "report-3" });

    const req = createFormRequest({ action: "delete" });
    const ctx = createContext("report-3");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    expect(prismaReportUpdateMock).toHaveBeenCalledTimes(1);
    const updateCall = prismaReportUpdateMock.mock.calls[0];
    expect(updateCall).toBeDefined();
    const updateArg = updateCall![0];

    expect(updateArg.where).toEqual({ id: "report-3" });
    expect(updateArg.data.status).toBe("DELETED");
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  it('applies the "hard-delete" action via Prisma delete', async () => {
    prismaReportDeleteMock.mockResolvedValueOnce({ id: "report-4" });

    const req = createFormRequest({ action: "hard-delete" });
    const ctx = createContext("report-4");

    const res = await POST(req, ctx);

    expect(res.status).toBe(303);

    expect(prismaReportDeleteMock).toHaveBeenCalledTimes(1);
    const deleteCall = prismaReportDeleteMock.mock.calls[0];
    expect(deleteCall).toBeDefined();
    const deleteArg = deleteCall![0];

    expect(deleteArg).toEqual({ where: { id: "report-4" } });
    expect(prismaReportUpdateMock).not.toHaveBeenCalled();
  });

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
