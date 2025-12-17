[**do-not-ghost-me**](../../../../README.md)

***

# Function: default()

> **default**(): `Promise`\<`Element`\>

Defined in: [src/app/admin/page.tsx:27](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/admin/page.tsx#L27)

Server-side admin dashboard page.

Responsibilities:
- Enforce host restriction (ADMIN_ALLOWED_HOST).
- Verify the signed admin session cookie.
- Fetch the latest reports.
- Delegate rendering to presentational components.

## Returns

`Promise`\<`Element`\>
