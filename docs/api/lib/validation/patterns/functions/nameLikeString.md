[**do-not-ghost-me**](../../../../README.md)

***

# Function: nameLikeString()

> **nameLikeString**(`min`, `max`, `fieldLabel`): `ZodString`

Defined in: [src/lib/validation/patterns.ts:40](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/validation/patterns.ts#L40)

Convenience helper for "name-like" strings:
- Trims the value.
- Enforces min/max length.
- Validates allowed characters.
- Requires at least one letter.

## Parameters

### min

`number`

Minimal length (after trimming).

### max

`number`

Maximal length (after trimming).

### fieldLabel

`string`

Human-readable field label for error messages.

## Returns

`ZodString`

A Zod string schema enforcing the configured constraints.
