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
 * RFC4122-compliant UUID v4 pattern:
 * - Version nibble is "4"
 * - Variant nibble is one of 8,9,a,b
 * - Accepts upper/lowercase hex
 */
export const UUID_V4_REGEX: RegExp =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * Validates a UUID v4 string.
 *
 * Note: Input is expected to be already trimmed and single-valued.
 *
 * @param value - Candidate UUID string (36 chars, hyphenated).
 * @returns True when the value matches UUID v4 format, false otherwise.
 */
export function isUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

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
