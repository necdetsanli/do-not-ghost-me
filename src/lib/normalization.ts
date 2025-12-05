// src/lib/normalization.ts

/**
 * Normalize a company name for consistent storage and lookups.
 *
 * - Trims leading and trailing whitespace.
 * - Collapses any internal whitespace (spaces, tabs, etc.) into a single space.
 *
 * We deliberately do NOT change casing here, so the original capitalization
 * from the user is preserved.
 */
export function normalizeCompanyName(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return trimmed;
  }

  // Collapse any sequence of whitespace (spaces, tabs, newlines) into a single space.
  return trimmed.replace(/\s+/g, " ");
}

/**
 * Normalize a country string into a cleaned value or null.
 *
 * - Accepts string, null, or undefined.
 * - Trims leading and trailing whitespace.
 * - Collapses internal whitespace sequences into a single space.
 * - Returns null if, after trimming, the value is empty.
 */
export function normalizeCountry(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed.replace(/\s+/g, " ");
}
