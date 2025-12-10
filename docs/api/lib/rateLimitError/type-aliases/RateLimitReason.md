[**do-not-ghost-me**](../../../README.md)

***

# Type Alias: RateLimitReason

> **RateLimitReason** = `"missing-ip"` \| `"company-position-limit"` \| `"daily-ip-limit"` \| `"unknown"`

Defined in: [src/lib/rateLimitError.ts:9](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimitError.ts#L9)

Narrow reasons for why a report was rate limited.

Extending this union is the preferred way to add new
rate-limit categories in the future.
