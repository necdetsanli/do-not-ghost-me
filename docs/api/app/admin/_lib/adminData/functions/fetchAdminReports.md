[**do-not-ghost-me**](../../../../../README.md)

***

# Function: fetchAdminReports()

> **fetchAdminReports**(): `Promise`\<[`AdminReportRow`](../../adminTypes/type-aliases/AdminReportRow.md)[]\>

Defined in: [src/app/admin/\_lib/adminData.ts:20](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/admin/_lib/adminData.ts#L20)

Fetch the latest reports for the admin dashboard.

Includes:
- company information (name and country),
- moderation metadata (status, flagged/deleted timestamps, reasons),
- basic report attributes needed for the moderation table.

## Returns

`Promise`\<[`AdminReportRow`](../../adminTypes/type-aliases/AdminReportRow.md)[]\>

A promise that resolves to an array of AdminReportRow objects,
         ordered by creation time (newest first) and limited to the most
         recent 100 reports.

## Throws

When Prisma fails or when a non-Error value is thrown,
                the error is logged and rethrown to the caller.
