[**do-not-ghost-me**](../../../README.md)

***

# Function: formatEnumLabel()

> **formatEnumLabel**(`value`): `string`

Defined in: [src/lib/enums.ts:26](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/enums.ts#L26)

Converts an enum value (e.g. "DEVOPS_SRE_PLATFORM") to a human-readable label
(e.g. "Devops Sre Platform").

Note: For nicer labels, this is typically overridden by custom maps below.

## Parameters

### value

`string`

The raw enum string value.

## Returns

`string`

A simple title-cased label derived from the enum name.
