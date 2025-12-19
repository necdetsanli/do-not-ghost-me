[**do-not-ghost-me**](../../../README.md)

***

# Function: createAdminSessionToken()

> **createAdminSessionToken**(): `string`

Defined in: [src/lib/adminAuth.ts:143](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/adminAuth.ts#L143)

Create a signed admin session token containing:
- sub: fixed "admin" subject
- iat: issued-at timestamp (seconds)
- exp: expiration timestamp (seconds)

## Returns

`string`

Opaque signed session token.
