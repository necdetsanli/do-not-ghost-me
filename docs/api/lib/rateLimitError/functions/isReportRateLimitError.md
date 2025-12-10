[**do-not-ghost-me**](../../../README.md)

***

# Function: isReportRateLimitError()

> **isReportRateLimitError**(`error`): `error is ReportRateLimitError`

Defined in: [src/lib/rateLimitError.ts:77](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimitError.ts#L77)

Type guard to check whether an unknown error value
is a ReportRateLimitError.

## Parameters

### error

`unknown`

The unknown error value to inspect.

## Returns

`error is ReportRateLimitError`

True if the error is an instance of ReportRateLimitError, false otherwise.
