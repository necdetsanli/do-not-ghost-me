// src/lib/validation/patterns.ts
import { z } from "zod";

/**
 * Shared regular expression for values that look like a "name", such as:
 * - Company name
 * - Position detail
 *
 * Allowed characters:
 * - Unicode letters and digits
 * - Spaces
 * - A limited set of safe symbols: / # + - _ & ( ) ' " . ,
 *
 * @returns A regular expression that can be used to validate name-like strings.
 */
export const NAME_LIKE_REGEX: RegExp = /^[\p{L}\p{N} _\-\/&()'",.+#]+$/u;

/**
 * Checks whether a string contains at least one letter.
 * Uses Unicode property escapes so it works for non-ASCII alphabets as well.
 *
 * @param value - The input string to inspect.
 * @returns True if the string contains at least one Unicode letter, false otherwise.
 */
export const containsAtLeastOneLetter = (value: string): boolean => /\p{L}/u.test(value);

/**
 * Convenience helper for "name-like" strings:
 * - Trims the value.
 * - Enforces min/max length.
 * - Validates allowed characters.
 * - Requires at least one letter.
 *
 * @param min - Minimal length (after trimming).
 * @param max - Maximal length (after trimming).
 * @param fieldLabel - Human-readable field label for error messages.
 * @returns A Zod string schema enforcing the configured constraints.
 */
export function nameLikeString(min: number, max: number, fieldLabel: string): z.ZodString {
  return z
    .string()
    .trim()
    .min(min, {
      message: `${fieldLabel} must be at least ${min} characters long`,
    })
    .max(max, {
      message: `${fieldLabel} must be at most ${max} characters long`,
    })
    .regex(NAME_LIKE_REGEX, {
      message: `${fieldLabel} contains invalid characters`,
    })
    .refine(containsAtLeastOneLetter, {
      message: `${fieldLabel} must contain at least one letter`,
    });
}
