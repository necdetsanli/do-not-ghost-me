[**do-not-ghost-me**](../../../../../README.md)

***

# Function: formatDateTime()

> **formatDateTime**(`dt`): `string`

Defined in: [src/app/admin/\_lib/adminFormatters.ts:13](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/admin/_lib/adminFormatters.ts#L13)

Format a Date instance into a compact, deterministic string
suitable for server-side rendering in the admin UI.

Example output: "2025-01-05 14:23"

## Parameters

### dt

`Date`

Date instance to format. Must be a valid Date.

## Returns

`string`

A string in "YYYY-MM-DD HH:mm" format based on the UTC timestamp.
