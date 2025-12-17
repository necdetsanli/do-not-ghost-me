[**do-not-ghost-me**](../../../../../../README.md)

***

# Function: GET()

> **GET**(): `Promise`\<`NextResponse`\<`unknown`\>\>

Defined in: [src/app/api/reports/stats/route.ts:144](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/api/reports/stats/route.ts#L144)

Returns aggregated statistics about reports:
- total number of ACTIVE reports across all time
- most reported company in the current UTC week among ACTIVE reports (if any)

## Returns

`Promise`\<`NextResponse`\<`unknown`\>\>

A JSON response with total reports and most reported company metadata.
