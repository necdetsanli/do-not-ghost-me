[**do-not-ghost-me**](../../../README.md)

***

# Function: isPrismaUniqueViolation()

> **isPrismaUniqueViolation**(`error`): `boolean`

Defined in: [src/lib/prismaErrors.ts:35](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/prismaErrors.ts#L35)

Returns true if the given error looks like a Prisma
unique constraint violation (code "P2002").

## Parameters

### error

`unknown`

The unknown error value to inspect.

## Returns

`boolean`

True when the error appears to be a unique constraint violation, false otherwise.
