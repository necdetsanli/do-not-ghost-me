[**do-not-ghost-me**](../../../README.md)

***

# Function: formatUtcDateTime()

> **formatUtcDateTime**(`inputDate`): `string`

Defined in: [src/lib/dates.ts:34](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/dates.ts#L34)

Formats a Date as a compact UTC date-time string: "YYYY-MM-DD HH:MM".

This uses the same UTC semantics and validation as [toUtcDayKey](toUtcDayKey.md).

## Parameters

### inputDate

`Date`

Date instance to format.

## Returns

`string`

A string like "2025-01-05 14:23" in UTC.

## Throws

If the provided Date is invalid.
