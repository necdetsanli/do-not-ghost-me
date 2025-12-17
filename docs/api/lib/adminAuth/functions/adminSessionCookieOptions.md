[**do-not-ghost-me**](../../../README.md)

***

# Function: adminSessionCookieOptions()

> **adminSessionCookieOptions**(): `object`

Defined in: [src/lib/adminAuth.ts:410](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/adminAuth.ts#L410)

Common cookie options for admin session.

Note:
- `path` is set to "/" so that both:
    - /admin (dashboard pages)
    - /api/admin/* (admin API routes)
  receive the cookie.
- Cookie is HttpOnly, secure (in production) and SameSite=strict.

## Returns

`object`

Standardized options for the admin session cookie.

### httpOnly

> **httpOnly**: `boolean`

### maxAge

> **maxAge**: `number`

### name

> **name**: `string`

### path

> **path**: `string`

### sameSite

> **sameSite**: `"strict"`

### secure

> **secure**: `boolean`
