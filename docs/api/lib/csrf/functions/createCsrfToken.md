[**do-not-ghost-me**](../../../README.md)

***

# Function: createCsrfToken()

> **createCsrfToken**(`purpose`): `string`

Defined in: [src/lib/csrf.ts:147](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/csrf.ts#L147)

Create a CSRF token bound to a specific purpose (for example "admin-login").

The token is:
- self-contained (no server-side storage),
- HMAC-signed with a secret,
- versioned via `CSRF_TOKEN_VERSION`,
- time-limited via `CSRF_TOKEN_TTL_MS`.

## Parameters

### purpose

`"admin-login"`

The logical purpose of the token.

## Returns

`string`

A base64url-encoded CSRF token string.

## Throws

When the provided purpose is an empty string after trimming.
