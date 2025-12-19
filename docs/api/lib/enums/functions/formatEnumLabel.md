[**do-not-ghost-me**](../../../README.md)

***

# Function: formatEnumLabel()

> **formatEnumLabel**(`value`): `string`

Defined in: [src/lib/enums.ts:26](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/enums.ts#L26)

Converts an enum value (e.g. "SALES_MARKETING") to a human-readable label
(e.g. "Sales Marketing").

Note: For nicer labels, this is typically overridden by custom maps below.

## Parameters

### value

`string`

The raw enum string value.

## Returns

`string`

A simple title-cased label derived from the enum name.
