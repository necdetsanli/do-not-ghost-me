import { describe, expect, it } from "vitest";
import {
  formatUtcDateTime,
  getUtcWeekStart,
  toUtcDayKey,
} from "../../src/lib/dates";

describe("src/lib/dates.ts", () => {
  describe("toUtcDayKey", () => {
    it("returns YYYY-MM-DD from the UTC representation of the date", () => {
      const input: Date = new Date("2025-12-16T18:30:45.000Z");
      expect(toUtcDayKey(input)).toBe("2025-12-16");
    });

    it("returns a valid YYYY-MM-DD string when called without arguments", () => {
      const dayKey: string = toUtcDayKey();
      expect(dayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("throws when the provided Date is invalid", () => {
      const invalid: Date = new Date("not-a-date");
      expect(() => toUtcDayKey(invalid)).toThrow(
        "toUtcDayKey received an invalid Date instance.",
      );
    });
  });

  describe("formatUtcDateTime", () => {
    it("formats as 'YYYY-MM-DD HH:MM' in UTC", () => {
      const input: Date = new Date("2025-01-05T14:23:59.999Z");
      expect(formatUtcDateTime(input)).toBe("2025-01-05 14:23");
    });

    it("throws when the provided Date is invalid", () => {
      const invalid: Date = new Date("still-not-a-date");
      expect(() => formatUtcDateTime(invalid)).toThrow(
        "toUtcDayKey received an invalid Date instance.",
      );
    });
  });

  describe("getUtcWeekStart", () => {
    it("returns Monday 00:00:00.000Z for a Monday input (same day)", () => {
      const input: Date = new Date("2025-12-15T18:30:00.000Z"); // Monday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2025-12-15T00:00:00.000Z");
    });

    it("returns previous Monday 00:00:00.000Z for a mid-week input", () => {
      const input: Date = new Date("2025-12-16T10:00:00.000Z"); // Tuesday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2025-12-15T00:00:00.000Z");
    });

    it("returns previous Monday 00:00:00.000Z for a Sunday input", () => {
      const input: Date = new Date("2025-12-21T23:59:59.000Z"); // Sunday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2025-12-15T00:00:00.000Z");
    });

    it("handles year boundaries correctly", () => {
      const input: Date = new Date("2025-01-01T12:00:00.000Z"); // Wednesday
      const weekStart: Date = getUtcWeekStart(input);
      expect(weekStart.toISOString()).toBe("2024-12-30T00:00:00.000Z"); // Monday
    });

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
