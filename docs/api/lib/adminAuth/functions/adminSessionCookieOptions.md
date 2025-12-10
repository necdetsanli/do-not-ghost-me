[**do-not-ghost-me**](../../../README.md)

***

# Function: adminSessionCookieOptions()

> **adminSessionCookieOptions**(): `object`

Defined in: [src/lib/adminAuth.ts:326](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/adminAuth.ts#L326)

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
