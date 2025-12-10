[**do-not-ghost-me**](../../../README.md)

***

# Function: createAdminSessionToken()

> **createAdminSessionToken**(): `string`

Defined in: [src/lib/adminAuth.ts:143](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/adminAuth.ts#L143)

Create a signed admin session token containing:
- sub: fixed "admin" subject
- iat: issued-at timestamp (seconds)
- exp: expiration timestamp (seconds)

## Returns

`string`

Opaque signed session token.
