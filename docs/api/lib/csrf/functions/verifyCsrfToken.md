[**do-not-ghost-me**](../../../README.md)

***

# Function: verifyCsrfToken()

> **verifyCsrfToken**(`purpose`, `token`): `boolean`

Defined in: [src/lib/csrf.ts:191](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/csrf.ts#L191)

Verify a CSRF token for a specific purpose.

Returns true if and only if:
- token is non-empty and decodes as JSON,
- version matches `CSRF_TOKEN_VERSION`,
- purpose matches the expected purpose,
- structure is valid,
- token is within the configured TTL,
- HMAC signature matches the expected value.

## Parameters

### purpose

`"admin-login"`

Expected CSRF purpose.

### token

Raw token string from the client (may be null).

`string` | `null`

## Returns

`boolean`

True when the token is valid, false otherwise.
