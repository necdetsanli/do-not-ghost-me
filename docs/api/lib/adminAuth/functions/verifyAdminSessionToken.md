[**do-not-ghost-me**](../../../README.md)

***

# Function: verifyAdminSessionToken()

> **verifyAdminSessionToken**(`token`): [`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md) \| `null`

Defined in: [src/lib/adminAuth.ts:164](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/adminAuth.ts#L164)

Verify a signed admin session token.

## Parameters

### token

Raw token string from the cookie.

`string` | `null` | `undefined`

## Returns

[`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md) \| `null`

Parsed payload when valid, or null when invalid/expired/malformed.
