[**do-not-ghost-me**](../../../../../../README.md)

***

# Function: POST()

> **POST**(`req`): `Promise`\<`NextResponse`\<`unknown`\>\>

Defined in: [src/app/api/admin/login/route.ts:348](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/api/admin/login/route.ts#L348)

Handles admin login POST requests.

Pipeline:
1. Enforce host and Origin restrictions for admin access.
2. Resolve client IP and apply in-memory IP-based login rate limiting.
3. Parse and validate the login form (password + CSRF token).
4. Verify CSRF token for the "admin-login" purpose.
5. Verify the admin password using constant-time comparison.
6. On success, reset rate limit state and create an admin session token.
7. Redirect to /admin with the session cookie attached.

Error handling:
- Host/Origin failures → 403 JSON.
- Rate limit exceeded → 429 JSON.
- Invalid CSRF/password/missing fields → redirect back to login with error flag.
- Unexpected failures → 500 JSON with a generic error message.

## Parameters

### req

`NextRequest`

Incoming admin login request.

## Returns

`Promise`\<`NextResponse`\<`unknown`\>\>

The HTTP response for the login attempt.
