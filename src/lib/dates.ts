// src/lib/dates.ts

/**
 * Build a UTC day key for a given Date in "YYYY-MM-DD" format.
 *
 * By default, uses the current time.
 */
export function toUtcDayKey(inputDate?: Date): string {
  const date = inputDate ?? new Date();
  return date.toISOString().slice(0, 10);
}
