// src/app/admin/_lib/adminFormatters.ts
import type { ReportStatus } from "@prisma/client";

/**
 * Format a Date instance into a compact, deterministic string
 * suitable for server-side rendering in the admin UI.
 *
 * Example output: "2025-01-05 14:23"
 */
export function formatDateTime(dt: Date): string {
  return dt.toISOString().replace("T", " ").slice(0, 16);
}

/**
 * Human-readable label for a report's moderation status.
 */
export function formatReportStatus(status: ReportStatus): string {
  if (status === "ACTIVE") {
    return "Active";
  }
  if (status === "FLAGGED") {
    return "Flagged";
  }
  // status === "DELETED"
  return "Deleted";
}

/**
 * Human-readable representation of the optional "days without reply" field.
 */
export function formatDaysWithoutReply(value: number | null): string {
  if (typeof value === "number") {
    return String(value);
  }
  return "—";
}
