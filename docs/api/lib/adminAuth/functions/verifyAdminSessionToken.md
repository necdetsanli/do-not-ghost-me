[**do-not-ghost-me**](../../../README.md)

***

# Function: verifyAdminSessionToken()

> **verifyAdminSessionToken**(`token`): [`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md) \| `null`

Defined in: [src/lib/adminAuth.ts:164](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/adminAuth.ts#L164)

Verify a signed admin session token.

## Parameters

### token

Raw token string from the cookie.

`string` | `null` | `undefined`

## Returns

[`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md) \| `null`

Parsed payload when valid, or null when invalid/expired/malformed.
