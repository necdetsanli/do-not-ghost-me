[**do-not-ghost-me**](../../../README.md)

***

# Function: hashIp()

> **hashIp**(`ip`): `string`

Defined in: [src/lib/rateLimit.ts:66](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/rateLimit.ts#L66)

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
