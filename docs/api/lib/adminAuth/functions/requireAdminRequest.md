[**do-not-ghost-me**](../../../README.md)

***

# Function: requireAdminRequest()

> **requireAdminRequest**(`req`): [`AdminSessionPayload`](../type-aliases/AdminSessionPayload.md)

Defined in: [src/lib/adminAuth.ts:353](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/adminAuth.ts#L353)

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
