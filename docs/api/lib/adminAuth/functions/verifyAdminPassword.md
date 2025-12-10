[**do-not-ghost-me**](../../../README.md)

***

# Function: verifyAdminPassword()

> **verifyAdminPassword**(`candidate`): `boolean`

Defined in: [src/lib/adminAuth.ts:93](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/adminAuth.ts#L93)

Verify the admin password supplied in the login form against
the configured ADMIN_PASSWORD value using a constant-time
comparison to avoid timing side channels.

## Parameters

### candidate

`string`

User-supplied password from the login form.

## Returns

`boolean`

True when the password matches, false otherwise.
