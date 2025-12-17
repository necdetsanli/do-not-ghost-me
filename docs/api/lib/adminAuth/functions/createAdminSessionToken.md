[**do-not-ghost-me**](../../../README.md)

***

# Function: createAdminSessionToken()

> **createAdminSessionToken**(): `string`

Defined in: [src/lib/adminAuth.ts:143](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/adminAuth.ts#L143)

Create a signed admin session token containing:
- sub: fixed "admin" subject
- iat: issued-at timestamp (seconds)
- exp: expiration timestamp (seconds)

## Returns

`string`

Opaque signed session token.
