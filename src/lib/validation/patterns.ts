// src/lib/validation/patterns.ts
import { z } from "zod";

/**
 * Shared pattern for values that look like a "name", such as:
 * - Company name
 * - Position detail
 *
 * Allowed:
 * - Unicode letters and digits
 * - Spaces
 * - A limited set of safe symbols: / # + - _ & ( ) ' " . ,
 */
export const NAME_LIKE_REGEX = /^[\p{L}\p{N}\s_\-\/&()'",.+#]+$/u;

/**
 * Pattern for country names.
 *
 * Allowed:
 * - Unicode letters
 * - Spaces
 * - Minimal punctuation: - ' . ( ) ,
 *
 * Not allowed:
 * - Digits
 */
export const COUNTRY_REGEX = /^[\p{L}\s\-'.(),]+$/u;

/**
 * Ensure that a string contains at least one letter.
 * Uses Unicode property escapes so it works for non-ASCII alphabets as well.
 */
export const containsAtLeastOneLetter = (value: string): boolean =>
  /\p{L}/u.test(value);

/**
 * Convenience helper for "name-like" strings:
 * - trims the value
 * - enforces min/max length
 * - validates allowed characters
 * - requires at least one letter
 *
 * @param min Minimal length (after trim)
 * @param max Maximum length (after trim)
 * @param fieldLabel Human-readable field label for error messages
 */
export function nameLikeString(
  min: number,
  max: number,
  fieldLabel: string,
): z.ZodString {
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
