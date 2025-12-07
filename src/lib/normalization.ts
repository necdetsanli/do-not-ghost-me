//src/lib/normalization.ts
/**
 * Normalizes a company name to a canonical form used for uniqueness checks.
 *
 * - Trims leading and trailing whitespace.
 * - Collapses multiple internal whitespace characters into a single space.
 * - Converts to lower case.
 *
 * Examples:
 *   "  ACME   Corp " -> "acme corp"
 *   "Acme"          -> "acme"
 *
 * @param raw - The raw company name as provided by the user.
 * @returns A normalized, lowercased name string, or an empty string if no content remains.
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
 * Normalizes an optional country string.
 *
 * - null / undefined / empty-after-trim -> null.
 * - Otherwise returns a trimmed string.
 *
 * Note: The application now primarily uses the CountryCode enum for storage,
 * but this helper is kept for any legacy or free-text paths that still exist.
 *
 * @param raw - The raw country string, or null/undefined.
 * @returns A trimmed country string, or null if no value is usable.
 */
export function normalizeCountry(
  raw: string | null | undefined,
): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const trimmed = raw.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
}
