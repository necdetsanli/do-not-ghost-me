[**do-not-ghost-me**](../../../README.md)

***

# Function: deriveNormalizedCompanyKey()

> **deriveNormalizedCompanyKey**(`request`): `string` \| `null`

Defined in: [src/lib/companyIntelService.ts:78](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/companyIntelService.ts#L78)

Builds a normalized company key suitable for lookups against Company.normalizedName.

## Parameters

### request

Validated company intel request.

\{ `key`: `string`; `source`: `"domain"`; \} | \{ `key`: `string`; `source`: `"linkedin"` \| `"glassdoor"` \| `"indeed"` \| `"workable"`; \}

## Returns

`string` \| `null`

Normalized key string or null when no usable key can be derived.
