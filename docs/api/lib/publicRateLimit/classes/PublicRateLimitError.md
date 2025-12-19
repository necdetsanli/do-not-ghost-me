[**do-not-ghost-me**](../../../README.md)

***

# Class: PublicRateLimitError

Defined in: [src/lib/publicRateLimit.ts:27](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/publicRateLimit.ts#L27)

Error type for public API rate limits.

## Extends

- `Error`

## Constructors

### Constructor

> **new PublicRateLimitError**(`message`, `statusCode`): `PublicRateLimitError`

Defined in: [src/lib/publicRateLimit.ts:30](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/publicRateLimit.ts#L30)

#### Parameters

##### message

`string`

##### statusCode

`number` = `429`

#### Returns

`PublicRateLimitError`

#### Overrides

`Error.constructor`

## Properties

### statusCode

> `readonly` **statusCode**: `number`

Defined in: [src/lib/publicRateLimit.ts:28](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/publicRateLimit.ts#L28)
