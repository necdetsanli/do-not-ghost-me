[**do-not-ghost-me**](../../../../../README.md)

***

# Function: POST()

> **POST**(`req`): `Promise`\<`NextResponse`\<`unknown`\>\>

Defined in: [src/app/api/reports/route.ts:95](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/api/reports/route.ts#L95)

Handle incoming ghosting reports.

Pipeline:
1. Extract client IP from the request and fail closed if it is missing.
2. Parse and validate the JSON payload using [reportSchema](../../../../../lib/validation/reportSchema/variables/reportSchema.md).
3. If validation fails *only* because the honeypot is filled, treat it as
   a bot submission and silently drop with HTTP 200.
4. Find or create the corresponding company using a normalized name key.
5. Enforce per-IP and per-company rate limits before writing anything.
6. Persist the report row and return a 200 response with its identifier.

On validation errors (excluding honeypot-only): HTTP 400 + structured Zod error.
On rate limit violations: HTTP 429 + user-friendly message.
On unexpected failures: log and respond with HTTP 500.

## Parameters

### req

`NextRequest`

The incoming Next.js request.

## Returns

`Promise`\<`NextResponse`\<`unknown`\>\>

A JSON NextResponse indicating success or failure.
