/**
 * Normalizes a company name to a canonical form used for uniqueness checks.
 *
 * Steps:
 * - Trims leading and trailing whitespace.
 * - Normalizes Unicode to NFKC.
 * - Converts to lower case.
 * - Removes all characters that are not letters or digits
 *   (this includes spaces, punctuation, etc.).
 *
 * Examples:
 *   "  ACME   Corp " -> "acmecorp"
 *   "Acme-Corp"      -> "acmecorp"
 *   "ACME/CORP"      -> "acmecorp"
 *   "Acme"           -> "acme"
 *
 * If the normalized value would be empty, an empty string is returned.
 *
 * @param raw - Raw company name as entered by the user.
 * @returns Normalized company name string, or an empty string when no usable value remains.
 */
export function normalizeCompanyName(raw: string): string {
  const trimmed: string = raw.trim();

  if (trimmed === "") {
    return "";
  }

  const normalizedLower: string = trimmed.normalize("NFKC").toLowerCase();

  const lettersAndDigitsOnly: string = normalizedLower.replace(
    /[^\p{L}\p{N}]+/gu,
    "",
  );

  if (lettersAndDigitsOnly === "") {
    return "";
  }

  return lettersAndDigitsOnly;
}
