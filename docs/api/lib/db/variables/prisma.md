[**do-not-ghost-me**](../../../README.md)

***

# Variable: prisma

> `const` **prisma**: `PrismaClient`

Defined in: [src/lib/db.ts:46](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/db.ts#L46)

Shared PrismaClient singleton for the application.

In non-production environments this instance is cached on `globalThis`
to avoid exhausting database connections during hot reloads.
Always prefer importing this singleton in API routes and server components.
