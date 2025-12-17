[**do-not-ghost-me**](../../../README.md)

***

# Function: createPrismaClient()

> **createPrismaClient**(): `PrismaClient`

Defined in: [src/lib/db.ts:16](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/db.ts#L16)

Create a new PrismaClient instance configured with the PostgreSQL driver adapter.

In most of the application you should use the exported `prisma` singleton
instead of calling this function directly. This helper exists primarily for
testing, scripts, or tooling where you explicitly want a fresh client.

## Returns

`PrismaClient`

A new PrismaClient instance using the shared connection pool.
