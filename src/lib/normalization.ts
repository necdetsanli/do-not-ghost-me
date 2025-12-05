// src/lib/normalization.ts

/**
 * Normalize a company name to a canonical form used for uniqueness checks.
 *
 * - Trims leading and trailing whitespace.
 * - Collapses multiple internal whitespace characters into a single space.
 * - Converts to lower case.
 *
 * Examples:
 *   "  ACME   Corp " -> "acme corp"
 *   "Acme"          -> "acme"
 */
export function normalizeCompanyName(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return "";
  }

  const collapsedWhitespace = trimmed.replace(/\s+/g, " ");

  return collapsedWhitespace.toLowerCase();
}

/**
 * Normalize an optional country string.
 *
 * - null / undefined / empty-after-trim -> null
 * - otherwise returns a trimmed string.
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

  return trimmed;
}
