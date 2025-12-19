[**do-not-ghost-me**](../../../../../README.md)

***

# Function: GET()

> **GET**(`req`): `Response`

Defined in: [src/app/api/health/route.ts:69](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/api/health/route.ts#L69)

Public healthcheck endpoint.

- Does NOT perform DB checks (process up only).
- Applies a per-IP in-memory rate limit to reduce abuse/DoS.

## Parameters

### req

`NextRequest`

Next.js request.

## Returns

`Response`

Health JSON response.
