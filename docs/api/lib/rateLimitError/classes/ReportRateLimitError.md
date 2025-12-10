[**do-not-ghost-me**](../../../README.md)

***

# Class: ReportRateLimitError

Defined in: [src/lib/rateLimitError.ts:36](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimitError.ts#L36)

Domain-specific error for report-related rate limits.

This is intentionally separate from generic HTTP or transport
errors so that callers can safely catch and map it to a 429
response (or similar) without accidentally hiding real failures.

## Extends

- `Error`

## Constructors

### Constructor

> **new ReportRateLimitError**(`message`, `reason`, `statusCode`): `ReportRateLimitError`

Defined in: [src/lib/rateLimitError.ts:54](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimitError.ts#L54)

Creates a new ReportRateLimitError.

#### Parameters

##### message

`string`

Human-readable error message, safe to expose to clients.

##### reason

[`RateLimitReason`](../type-aliases/RateLimitReason.md)

Machine-readable reason code describing the limit type.

##### statusCode

`number` = `DEFAULT_RATE_LIMIT_STATUS_CODE`

HTTP status code to associate with the error (defaults to 429).

#### Returns

`ReportRateLimitError`

#### Overrides

`Error.constructor`

## Properties

### reason

> `readonly` **reason**: [`RateLimitReason`](../type-aliases/RateLimitReason.md)

Defined in: [src/lib/rateLimitError.ts:40](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimitError.ts#L40)

Machine-readable reason describing why the rate limit was triggered.

***

### statusCode

> `readonly` **statusCode**: `number`

Defined in: [src/lib/rateLimitError.ts:45](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimitError.ts#L45)

HTTP status code associated with this rate-limit error.
