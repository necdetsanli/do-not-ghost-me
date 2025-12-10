[**do-not-ghost-me**](../../../README.md)

***

# Function: formatUnknownError()

> **formatUnknownError**(`error`): `string`

Defined in: src/lib/errorUtils.ts:13

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
