[**do-not-ghost-me**](../../../../../../README.md)

***

# Function: GET()

> **GET**(`req`): `Promise`\<`NextResponse`\<`unknown`\>\>

Defined in: [src/app/api/companies/search/route.ts:45](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/api/companies/search/route.ts#L45)

Suggest existing companies by name prefix (case-insensitive).

This endpoint is **best-effort**:
- It never writes to the database.
- It returns at most a small list of suggestions.
- It does not enforce rate limiting yet; abuse protection is expected to be
  handled at the infrastructure (WAF / edge) layer if necessary.

Query params:
- q: partial company name typed by the user.

Ordering:
- name ASC
- id ASC (tie-breaker for deterministic ordering)

## Parameters

### req

`NextRequest`

Incoming Next.js request.

## Returns

`Promise`\<`NextResponse`\<`unknown`\>\>

A JSON array of suggestions or an error payload on failure.
