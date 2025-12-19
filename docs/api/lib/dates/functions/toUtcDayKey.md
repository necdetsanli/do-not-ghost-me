[**do-not-ghost-me**](../../../README.md)

***

# Function: toUtcDayKey()

> **toUtcDayKey**(`inputDate?`): `string`

Defined in: [src/lib/dates.ts:13](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/dates.ts#L13)

Builds a UTC day key for a given Date in "YYYY-MM-DD" format.

This function always uses the UTC representation of the date.
When no argument is provided, the current time is used.

## Parameters

### inputDate?

`Date`

Optional date to format; defaults to the current time when omitted.

## Returns

`string`

A string in "YYYY-MM-DD" format representing the UTC day.

## Throws

If the provided Date is invalid.
