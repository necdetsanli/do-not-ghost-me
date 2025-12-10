[**do-not-ghost-me**](../../../README.md)

***

# Function: withAdminSessionCookie()

> **withAdminSessionCookie**(`res`, `token`): `NextResponse`

Defined in: [src/lib/adminAuth.ts:351](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/adminAuth.ts#L351)

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
