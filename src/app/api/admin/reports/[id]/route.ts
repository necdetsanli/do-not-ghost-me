// src/app/api/admin/reports/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/adminAuth";
import { logInfo, logWarn, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Normalize an arbitrary string field from form data:
 * - casts to string
 * - trims whitespace
 * - enforces max length
 * - returns null for empty strings
 */
function normalizeOptionalText(
  value: FormDataEntryValue | null,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

type AdminReportRouteParams = {
  id: string;
};

/**
 * Handle admin moderation actions for a single report:
 *
 * Supported actions:
 * - "flag"        → status=FLAGGED, flaggedAt=now, flaggedReason (optional)
 * - "restore"     → status=ACTIVE, clears flagged/deleted metadata
 * - "delete"      → soft delete (status=DELETED, deletedAt=now)
 * - "hard-delete" → hard delete (DELETE FROM report WHERE id = ?)
 *
 * All actions:
 * - require a valid admin session cookie
 * - enforce optional ADMIN_ALLOWED_HOST host restriction (via requireAdminRequest)
 * - redirect back to /admin on success
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<AdminReportRouteParams> },
): Promise<NextResponse> {
  // 1) Admin guard: host + signed session cookie
  try {
    requireAdminRequest(request);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Admin access is not allowed.";

    logWarn(
      "[admin] Unauthorized or disallowed admin report moderation request",
      {
        path: request.nextUrl.pathname,
        method: request.method,
        errorMessage: message,
      },
    );

    const status =
      message === "Admin access is not allowed from this host." ? 403 : 401;

    return NextResponse.json({ error: message }, { status });
  }

  // 2) Params: Next 15 route handler typings: params is a Promise
  const { id: idFromParams } = await context.params;
  const reportId = typeof idFromParams === "string" ? idFromParams.trim() : "";

  if (reportId === "") {
    logWarn("[admin] Missing or invalid report id in moderation request", {
      path: request.nextUrl.pathname,
      method: request.method,
    });

    return NextResponse.json(
      { error: "Missing or invalid report id" },
      { status: 400 },
    );
  }

  // 3) Form data
  const formData = await request.formData();
  const actionRaw = formData.get("action");

  if (typeof actionRaw !== "string") {
    logWarn("[admin] Missing moderation action in admin report request", {
      reportId,
      path: request.nextUrl.pathname,
      method: request.method,
    });

    return NextResponse.json(
      { error: "Missing moderation action" },
      { status: 400 },
    );
  }

  const action = actionRaw.trim();

  try {
    if (action === "flag") {
      const reason = normalizeOptionalText(formData.get("reason"), 255);

      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "FLAGGED" satisfies ReportStatus,
          flaggedAt: new Date(),
          flaggedReason: reason,
        },
      });

      logInfo("[admin] Report flagged", {
        reportId,
        action: "flag",
        reason,
      });
    } else if (action === "restore") {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "ACTIVE" satisfies ReportStatus,
          flaggedAt: null,
          flaggedReason: null,
          deletedAt: null,
        },
      });

      logInfo("[admin] Report restored", {
        reportId,
        action: "restore",
      });
    } else if (action === "delete") {
      // Soft delete: keep the row, hide from public stats.
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "DELETED" satisfies ReportStatus,
          deletedAt: new Date(),
        },
      });

      logInfo("[admin] Report soft-deleted", {
        reportId,
        action: "delete",
      });
    } else if (action === "hard-delete") {
      // Hard delete: permanently remove the row.
      await prisma.report.delete({
        where: { id: reportId },
      });

      logInfo("[admin] Report hard-deleted", {
        reportId,
        action: "hard-delete",
      });
    } else {
      logWarn("[admin] Unknown moderation action", {
        reportId,
        action,
      });

      return NextResponse.json(
        { error: `Unknown moderation action: ${action}` },
        { status: 400 },
      );
    }

    // On success, redirect back to the admin dashboard.
    const redirectUrl = new URL("/admin", request.url);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError("[admin] Failed to moderate report", {
        reportId,
        action,
        errorName: error.name,
        errorMessage: error.message,
      });
    } else {
      logError("[admin] Failed to moderate report: non-Error value thrown", {
        reportId,
        action,
        errorValueType: typeof error,
      });
    }

    return NextResponse.json(
      { error: "Failed to apply moderation action" },
      { status: 500 },
    );
  }
}
