[**do-not-ghost-me**](../../../README.md)

***

# Function: labelForCountry()

> **labelForCountry**(`code`): `string`

Defined in: [src/lib/enums.ts:401](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/enums.ts#L401)

Returns a human-readable label for a given country enum value.

The function first looks up a custom label in `COUNTRY_LABELS`
(e.g. "TR" -> "Turkey"). If no custom label is defined for the
provided code, it falls back to returning the raw enum value
itself (e.g. "TR").

This makes the UI resilient when new country codes are added
at the database level: missing labels will still render as the
underlying enum code until `COUNTRY_LABELS` is updated.

## Parameters

### code

`CountryCode`

The CountryCode enum value.

## Returns

`string`

A human-readable label or the raw enum code.
