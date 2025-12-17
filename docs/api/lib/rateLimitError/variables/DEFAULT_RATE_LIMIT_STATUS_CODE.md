[**do-not-ghost-me**](../../../README.md)

***

# Variable: DEFAULT\_RATE\_LIMIT\_STATUS\_CODE

> `const` **DEFAULT\_RATE\_LIMIT\_STATUS\_CODE**: `429` = `429`

Defined in: [src/lib/rateLimitError.ts:21](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/rateLimitError.ts#L21)

Default HTTP status code for rate-limit responses.

Keeping this as a constant avoids magic numbers in constructors
and makes it easier to adjust globally if needed.
