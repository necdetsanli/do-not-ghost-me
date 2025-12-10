[**do-not-ghost-me**](../../../README.md)

***

# Function: requireAdminRequest()

> **requireAdminRequest**(`req`): [`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md)

Defined in: [src/lib/adminAuth.ts:282](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/adminAuth.ts#L282)

Validate that this request is allowed to reach the admin surface:
- passes the host check (ADMIN_ALLOWED_HOST), and
- carries a valid admin session cookie.

## Parameters

### req

`NextRequest`

Incoming NextRequest.

## Returns

[`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md)

Parsed admin session payload when authorized.

## Throws

If the host is not allowed or the session is missing/invalid.
