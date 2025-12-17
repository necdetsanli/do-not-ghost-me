[**do-not-ghost-me**](../../../README.md)

***

# Function: isPrismaUniqueViolation()

> **isPrismaUniqueViolation**(`error`): `boolean`

Defined in: [src/lib/prismaErrors.ts:35](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/prismaErrors.ts#L35)

Returns true if the given error looks like a Prisma
unique constraint violation (code "P2002").

## Parameters

### error

`unknown`

The unknown error value to inspect.

## Returns

`boolean`

True when the error appears to be a unique constraint violation, false otherwise.
