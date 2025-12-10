[**do-not-ghost-me**](../../../README.md)

***

# Function: normalizeCompanyName()

> **normalizeCompanyName**(`raw`): `string`

Defined in: [src/lib/normalization.ts:22](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/normalization.ts#L22)

Normalizes a company name to a canonical form used for uniqueness checks.

Steps:
- Trims leading and trailing whitespace.
- Normalizes Unicode to NFKC.
- Converts to lower case.
- Removes all characters that are not letters or digits
  (this includes spaces, punctuation, etc.).

Examples:
  "  ACME   Corp " -> "acmecorp"
  "Acme-Corp"      -> "acmecorp"
  "ACME/CORP"      -> "acmecorp"
  "Acme"           -> "acme"

If the normalized value would be empty, an empty string is returned.

## Parameters

### raw

`string`

Raw company name as entered by the user.

## Returns

`string`

Normalized company name string, or an empty string when no usable value remains.
