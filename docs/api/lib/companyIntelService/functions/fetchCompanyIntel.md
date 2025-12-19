[**do-not-ghost-me**](../../../README.md)

***

# Function: fetchCompanyIntel()

> **fetchCompanyIntel**(`request`, `options?`): `Promise`\<[`CompanyIntelResult`](../type-aliases/CompanyIntelResult.md)\>

Defined in: [src/lib/companyIntelService.ts:126](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/companyIntelService.ts#L126)

Aggregates company intel for the public API without exposing any user content.

Steps:
1) Normalize the lookup key from the source/key pair.
2) Find the company with the highest ACTIVE report count matching the key.
3) Enforce k-anonymity on total report count.
4) Fetch 90d counts and latest activity timestamp.

## Parameters

### request

Validated request parameters.

\{ `key`: `string`; `source`: `"domain"`; \} | \{ `key`: `string`; `source`: `"linkedin"` \| `"glassdoor"` \| `"indeed"` \| `"workable"`; \}

### options?

Optional overrides for testing/tuning.

#### enforceKAnonymity?

`boolean`

#### kAnonymityThreshold?

`number`

#### now?

`Date`

## Returns

`Promise`\<[`CompanyIntelResult`](../type-aliases/CompanyIntelResult.md)\>

Aggregated signals or an insufficient_data marker.
