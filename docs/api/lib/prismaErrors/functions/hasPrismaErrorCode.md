[**do-not-ghost-me**](../../../README.md)

***

# Function: hasPrismaErrorCode()

> **hasPrismaErrorCode**(`error`, `code`): `boolean`

Defined in: [src/lib/prismaErrors.ts:18](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/prismaErrors.ts#L18)

Checks whether an unknown error value looks like a Prisma error
with the given error code (for example "P2002").

This avoids importing Prisma client error classes everywhere and keeps
error handling lightweight at call sites.

## Parameters

### error

`unknown`

The unknown error value to inspect.

### code

`string`

The Prisma error code to match (for example "P2002").

## Returns

`boolean`

True if the error has a matching Prisma `code` property, false otherwise.
