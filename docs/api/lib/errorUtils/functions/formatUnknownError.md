[**do-not-ghost-me**](../../../README.md)

***

# Function: formatUnknownError()

> **formatUnknownError**(`error`): `string`

Defined in: [src/lib/errorUtils.ts:13](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/errorUtils.ts#L13)

Safely formats an unknown error value into a string for logging.

- If the value is an Error instance, returns its message.
- Otherwise attempts to coerce to string.
- Falls back to a fixed placeholder when even that fails.

## Parameters

### error

`unknown`

The unknown error value to format.

## Returns

`string`

A best-effort string representation of the error.
