// src/lib/dates.ts

/**
 * Builds a UTC day key for a given Date in "YYYY-MM-DD" format.
 *
 * This function always uses the UTC representation of the date.
 * When no argument is provided, the current time is used.
 *
 * @param inputDate - Optional date to format; defaults to the current time when omitted.
 * @returns A string in "YYYY-MM-DD" format representing the UTC day.
 * @throws {Error} If the provided Date is invalid.
 */
export function toUtcDayKey(inputDate?: Date): string {
  const date: Date = inputDate ?? new Date();

  // Defensive guard in case an invalid Date is ever passed in.
  const isInvalidDate: boolean = Number.isNaN(date.getTime()) === true;
  if (isInvalidDate === true) {
    throw new Error("toUtcDayKey received an invalid Date instance.");
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Formats a Date as a compact UTC date-time string: "YYYY-MM-DD HH:MM".
 *
 * This uses the same UTC semantics and validation as {@link toUtcDayKey}.
 *
 * @param inputDate - Date instance to format.
 * @returns A string like "2025-01-05 14:23" in UTC.
 * @throws {Error} If the provided Date is invalid.
 */
export function formatUtcDateTime(inputDate: Date): string {
  // Reuse the same validation + day extraction logic.
  const dayKey: string = toUtcDayKey(inputDate);

  const iso: string = inputDate.toISOString();
  const timePart: string = iso.slice(11, 16); // "HH:MM"

  return `${dayKey} ${timePart}`;
}

/**
 * Returns the start of the current week in UTC (Monday 00:00:00.000).
 *
 * Week definition: Monday -> next Monday, based on UTC.
 *
 * @param date - Any date within the target week.
 * @returns A Date representing Monday 00:00 UTC of the same week.
 */
export function getUtcWeekStart(date: Date): Date {
  const midnightUtc: Date = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  // JS: Sunday=0 ... Saturday=6
  // We want Monday=0 ... Sunday=6
  const dayOfWeekMondayBased: number = (midnightUtc.getUTCDay() + 6) % 7;

  midnightUtc.setUTCDate(midnightUtc.getUTCDate() - dayOfWeekMondayBased);
  return midnightUtc;
}
