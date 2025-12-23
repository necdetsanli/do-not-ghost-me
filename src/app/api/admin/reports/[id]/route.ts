// src/app/api/admin/reports/[id]/route.ts
import { requireAdminRequest } from "@/lib/adminAuth";
import { verifyCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { formatUnknownError } from "@/lib/errorUtils";
import { deriveCorrelationId, setCorrelationIdHeader } from "@/lib/correlation";
import { adminJsonError } from "@/lib/adminErrorResponse";
import { logError, logInfo, logWarn } from "@/lib/logger";
import type { ReportStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AdminReportRouteParams = {
  id: string;
};

type AdminReportRouteContext = {
  params: Promise<AdminReportRouteParams>;
};

/**
 * Normalize an arbitrary string field from form data:
 * - casts to string
 * - trims whitespace
 * - enforces max length
 * - returns null for empty strings
 *
 * @param value - Raw value read from FormData.
 * @param maxLength - Maximum allowed length for the normalized string.
 * @returns A trimmed, truncated string or null when empty/invalid.
 */
function normalizeOptionalText(value: FormDataEntryValue | null, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed: string = value.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

/**
 * Handle admin moderation actions for a single report.
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
 *
 * @param request - Incoming Next.js request containing form data.
 * @param context - Route context with a lazy params Promise (Next 15).
 * @returns A redirect response on success or JSON error on failure.
 */
export async function POST(
  request: NextRequest,
  context: AdminReportRouteContext,
): Promise<NextResponse> {
  const correlationId = deriveCorrelationId(request);
  const withCorrelation = (res: NextResponse): NextResponse => {
    setCorrelationIdHeader(res, correlationId);
    return res;
  };
  const logCtx = (ctx?: Record<string, unknown>): Record<string, unknown> => ({
    correlationId,
    ...ctx,
  });

  // 1) Admin guard: host + signed session cookie
  try {
    requireAdminRequest(request);
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : "Admin access is not allowed.";

    logWarn(
      "[admin] Unauthorized or disallowed admin report moderation request",
      logCtx({
        path: request.nextUrl.pathname,
        method: request.method,
        errorMessage: message,
      }),
    );

    const status: number = message === "Admin access is not allowed from this host." ? 403 : 401;

    return withCorrelation(adminJsonError(message, { status }));
  }

  // 2) Params: Next 15 route handler typings use Promise for params.
  const { id: idFromParams } = await context.params;
  const reportId: string = idFromParams.trim();

  if (reportId === "") {
    logWarn("[admin] Missing or invalid report id in moderation request", logCtx({
      path: request.nextUrl.pathname,
      method: request.method,
    }));

    return withCorrelation(adminJsonError("Missing or invalid report id", { status: 400 }));
  }

  // 3) Form data
  const formData: FormData = await request.formData();

  // 4) CSRF validation
  const csrfToken: FormDataEntryValue | null = formData.get("csrf_token");
  const csrfTokenString: string | null = typeof csrfToken === "string" ? csrfToken : null;

  if (!verifyCsrfToken("admin-moderation", csrfTokenString)) {
    logWarn("[admin] Invalid or missing CSRF token in moderation request", logCtx({
      reportId,
      path: request.nextUrl.pathname,
      method: request.method,
    }));

    return withCorrelation(adminJsonError("Invalid CSRF token", { status: 403 }));
  }

  // 5) Validate action
  const actionRaw = formData.get("action");

  if (typeof actionRaw !== "string") {
    logWarn("[admin] Missing moderation action in admin report request", logCtx({
      reportId,
      path: request.nextUrl.pathname,
      method: request.method,
    }));

    return withCorrelation(NextResponse.json({ error: "Missing moderation action" }, { status: 400 }));
  }

  const action: string = actionRaw.trim();

  try {
    if (action === "flag") {
      const reason: string | null = normalizeOptionalText(formData.get("reason"), 255);

      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "FLAGGED" satisfies ReportStatus,
          flaggedAt: new Date(),
          flaggedReason: reason,
        },
      });

      logInfo("[admin] Report flagged", logCtx({
        reportId,
        action: "flag",
        reason,
      }));
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

      logInfo("[admin] Report restored", logCtx({
        reportId,
        action: "restore",
      }));
    } else if (action === "delete") {
      // Soft delete: keep the row, hide from public stats.
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "DELETED" satisfies ReportStatus,
          deletedAt: new Date(),
        },
      });

      logInfo("[admin] Report soft-deleted", logCtx({
        reportId,
        action: "delete",
      }));
    } else if (action === "hard-delete") {
      // Hard delete: permanently remove the row.
      await prisma.report.delete({
        where: { id: reportId },
      });

      logInfo("[admin] Report hard-deleted", logCtx({
        reportId,
        action: "hard-delete",
      }));
    } else {
      logWarn("[admin] Unknown moderation action", logCtx({
        reportId,
        action,
      }));

      return withCorrelation(adminJsonError(`Unknown moderation action: ${action}`, { status: 400 }));
    }

    // On success, redirect back to the admin dashboard.
    const redirectUrl = new URL("/admin", request.url);

    return withCorrelation(NextResponse.redirect(redirectUrl, 303));
  } catch (error: unknown) {
    logError("[admin] Failed to moderate report", logCtx({
      reportId,
      action,
      path: request.nextUrl.pathname,
      method: request.method,
      error: formatUnknownError(error),
    }));

    return withCorrelation(adminJsonError("Failed to apply moderation action", { status: 500 }));
  }
}
