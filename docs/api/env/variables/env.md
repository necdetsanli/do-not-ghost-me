[**do-not-ghost-me**](../../README.md)

***

# Variable: env

> `const` **env**: `Readonly`\<\{ `ADMIN_ALLOWED_HOST?`: `string`; `ADMIN_CSRF_SECRET?`: `string`; `ADMIN_PASSWORD?`: `string`; `ADMIN_SESSION_SECRET?`: `string`; `DATABASE_URL`: `string`; `NODE_ENV`: `"development"` \| `"test"` \| `"production"`; `RATE_LIMIT_IP_SALT`: `string`; `RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP`: `number`; `RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY`: `number`; \}\>

Defined in: [src/env.ts:188](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/env.ts#L188)

Validated, read-only environment object.
Import this instead of reading process.env directly to keep configuration
access centralized and type-safe across the application.
