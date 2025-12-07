/**
 * Builds a UTC day key for a given Date in "YYYY-MM-DD" format.
 *
 * This function always uses the UTC representation of the date.
 * When no argument is provided, the current time is used.
 *
 * @param inputDate - Optional date to format; defaults to the current time.
 * @returns A string in "YYYY-MM-DD" format representing the UTC day.
 */
export function toUtcDayKey(inputDate?: Date): string {
  const date = inputDate ?? new Date();
  return date.toISOString().slice(0, 10);
}
