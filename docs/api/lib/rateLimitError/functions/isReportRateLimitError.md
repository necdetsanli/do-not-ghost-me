[**do-not-ghost-me**](../../../README.md)

***

# Function: isReportRateLimitError()

> **isReportRateLimitError**(`error`): `error is ReportRateLimitError`

Defined in: [src/lib/rateLimitError.ts:95](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/rateLimitError.ts#L95)

Type guard to check whether an unknown error value
is a ReportRateLimitError.

## Parameters

### error

`unknown`

The unknown error value to inspect.

## Returns

`error is ReportRateLimitError`

True if the error is an instance of ReportRateLimitError, false otherwise.
