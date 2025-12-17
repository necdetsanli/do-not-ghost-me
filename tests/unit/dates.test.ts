// tests/unit/dates.test.ts
import { describe, expect, it } from "vitest";
import { formatUtcDateTime, getUtcWeekStart, toUtcDayKey } from "@/lib/dates";

describe("lib/dates", () => {
  describe("toUtcDayKey", () => {
    /**
     * Ensures the function formats dates using the UTC calendar date,
     * not local time, to avoid timezone-dependent day shifts.
     */
    it("returns YYYY-MM-DD from the UTC representation of the date", () => {
      const input: Date = new Date("2025-12-16T18:30:45.000Z");
      expect(toUtcDayKey(input)).toBe("2025-12-16");
    });

    /**
     * Ensures the no-arg path produces a stable, valid day key string.
     * (Exact value depends on the runtime clock, so we validate the shape.)
     */
    it("returns a valid YYYY-MM-DD string when called without arguments", () => {
      const dayKey: string = toUtcDayKey();
      expect(dayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    /**
     * Ensures invalid Date inputs fail fast with a clear error message.
     */
    it("throws when the provided Date is invalid", () => {
      const invalid: Date = new Date("not-a-date");
      expect(() => toUtcDayKey(invalid)).toThrow(
        "toUtcDayKey received an invalid Date instance.",
      );
    });
  });

  describe("formatUtcDateTime", () => {
    /**
     * Ensures the formatter returns a UTC timestamp in the expected
     * `YYYY-MM-DD HH:MM` format and truncates seconds/milliseconds.
     */
    it("formats as 'YYYY-MM-DD HH:MM' in UTC", () => {
      const input: Date = new Date("2025-01-05T14:23:59.999Z");
      expect(formatUtcDateTime(input)).toBe("2025-01-05 14:23");
    });

    /**
     * Ensures invalid Date inputs fail fast with a clear error message.
     */
    it("throws when the provided Date is invalid", () => {
      const invalid: Date = new Date("still-not-a-date");
      expect(() => formatUtcDateTime(invalid)).toThrow(
        "toUtcDayKey received an invalid Date instance.",
      );
    });
  });

  describe("getUtcWeekStart", () => {
    /**
     * Ensures week start is defined as Monday 00:00:00.000Z and that
     * a Monday input returns the same Monday (at UTC midnight).
     */
    it("returns Monday 00:00:00.000Z for a Monday input (same day)", () => {
      const input: Date = new Date("2025-12-15T18:30:00.000Z"); // Monday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2025-12-15T00:00:00.000Z");
    });

    /**
     * Ensures mid-week dates (e.g., Tuesday) resolve to the Monday of
     * the same UTC week.
     */
    it("returns previous Monday 00:00:00.000Z for a mid-week input", () => {
      const input: Date = new Date("2025-12-16T10:00:00.000Z"); // Tuesday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2025-12-15T00:00:00.000Z");
    });

    /**
     * Ensures Sunday resolves to the previous Monday, keeping the week
     * anchored on Monday in UTC.
     */
    it("returns previous Monday 00:00:00.000Z for a Sunday input", () => {
      const input: Date = new Date("2025-12-21T23:59:59.000Z"); // Sunday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2025-12-15T00:00:00.000Z");
    });

    /**
     * Ensures calculations across year boundaries remain correct and
     * do not accidentally clamp within the same year.
     */
    it("handles year boundaries correctly", () => {
      const input: Date = new Date("2025-01-01T12:00:00.000Z"); // Wednesday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2024-12-30T00:00:00.000Z"); // Monday
    });

    /**
     * Ensures the returned value is normalized to UTC midnight so it can
     * be used safely for range queries and week-key computations.
     */
    it("always returns a UTC midnight timestamp (HH:MM:SS.mmm = 00:00:00.000)", () => {
      const input: Date = new Date("2025-03-06T22:11:09.123Z");
      const weekStart: Date = getUtcWeekStart(input);

      expect(weekStart.getUTCHours()).toBe(0);
      expect(weekStart.getUTCMinutes()).toBe(0);
      expect(weekStart.getUTCSeconds()).toBe(0);
      expect(weekStart.getUTCMilliseconds()).toBe(0);
    });
  });
});
