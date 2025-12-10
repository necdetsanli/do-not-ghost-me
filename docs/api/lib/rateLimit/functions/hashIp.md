[**do-not-ghost-me**](../../../README.md)

***

# Function: hashIp()

> **hashIp**(`ip`): `string`

Defined in: [src/lib/rateLimit.ts:69](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimit.ts#L69)

Hashes an IP address with a secret salt so that raw IPs are never stored.

Exported so that unit tests can verify hashing behavior.

## Parameters

### ip

`string`

The raw IP address string to hash.

## Returns

`string`

A hex-encoded HMAC-SHA256 hash of the IP and salt.

## Throws

ReportRateLimitError If the provided IP string is empty after trimming.
