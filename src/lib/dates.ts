// src/lib/dates.ts

/**
 * Builds a UTC day key for a given Date in "YYYY-MM-DD" format.
 *
 * This function always uses the UTC representation of the date.
 * When no argument is provided, the current time is used.
 *
 * @param inputDate - Optional date to format; defaults to the current time.
 * @returns A string in "YYYY-MM-DD" format representing the UTC day.
 * @throws If the provided Date is invalid.
 */
export function toUtcDayKey(inputDate?: Date): string {
  const date = inputDate ?? new Date();

  // Defensive guard in case an invalid Date is ever passed in.
  if (Number.isNaN(date.getTime())) {
    throw new Error("toUtcDayKey received an invalid Date instance.");
  }

  return date.toISOString().slice(0, 10);
}
