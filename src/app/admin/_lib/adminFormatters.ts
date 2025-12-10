// src/app/admin/_lib/adminFormatters.ts
import type { ReportStatus } from "@prisma/client";

/**
 * Format a Date instance into a compact, deterministic string
 * suitable for server-side rendering in the admin UI.
 *
 * Example output: "2025-01-05 14:23"
 *
 * @param dt - Date instance to format. Must be a valid Date.
 * @returns A string in "YYYY-MM-DD HH:mm" format based on the UTC timestamp.
 */
export function formatDateTime(dt: Date): string {
  return dt.toISOString().replace("T", " ").slice(0, 16);
}

/**
 * Human-readable label for a report's moderation status.
 *
 * @param status - The ReportStatus enum value to render.
 * @returns A short human-readable label for the given status.
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
 *
 * @param value - Number of days without reply, or null when not provided.
 * @returns The numeric value as a string, or "—" when null.
 */
export function formatDaysWithoutReply(value: number | null): string {
  if (typeof value === "number") {
    return String(value);
  }
  return "—";
}
