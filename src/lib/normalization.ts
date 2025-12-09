/**
 * Normalizes a company name to a canonical form used for uniqueness checks.
 *
 * - Trims leading and trailing whitespace.
 * - Normalizes Unicode (NFKC).
 * - Converts to lower case.
 * - Removes all characters that are not letters or digits
 *   (this includes spaces, punctuation, etc.).
 *
 * Examples:
 *   "  ACME   Corp "   -> "acmecorp"
 *   "Acme-Corp"        -> "acmecorp"
 *   "ACME/CORP"        -> "acmecorp"
 *   "Acme"             -> "acme"
 */
export function normalizeCompanyName(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return "";
  }

  const lower = trimmed.normalize("NFKC").toLowerCase();

  const lettersAndDigitsOnly = lower.replace(/[^\p{L}\p{N}]+/gu, "");

  if (lettersAndDigitsOnly === "") {
    return "";
  }

  return lettersAndDigitsOnly;
}
