[**do-not-ghost-me**](../../../README.md)

***

# Function: enforcePublicIpRateLimit()

> **enforcePublicIpRateLimit**(`args`): `void`

Defined in: [src/lib/publicRateLimit.ts:131](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/publicRateLimit.ts#L131)

Enforces a per-IP, per-scope sliding-window rate limit using hashed IP keys.

## Parameters

### args

`EnforceArgs`

Arguments describing the request context and limits.

## Returns

`void`
