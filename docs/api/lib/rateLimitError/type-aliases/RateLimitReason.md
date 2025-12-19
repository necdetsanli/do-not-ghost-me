[**do-not-ghost-me**](../../../README.md)

***

# Type Alias: RateLimitReason

> **RateLimitReason** = `"missing-ip"` \| `"company-position-limit"` \| `"daily-ip-limit"` \| `"unknown"`

Defined in: [src/lib/rateLimitError.ts:9](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/rateLimitError.ts#L9)

Narrow reasons for why a report was rate limited.

Extending this union is the preferred way to add new
rate-limit categories in the future.
