[**do-not-ghost-me**](../../../README.md)

***

# Function: withAdminSessionCookie()

> **withAdminSessionCookie**(`res`, `token`): `NextResponse`

Defined in: [src/lib/adminAuth.ts:435](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/adminAuth.ts#L435)

Attach an admin session cookie to an existing NextResponse.

## Parameters

### res

`NextResponse`

Response object to mutate.

### token

`string`

Signed admin session token to store in the cookie.

## Returns

`NextResponse`

The same response instance for fluent chaining.
