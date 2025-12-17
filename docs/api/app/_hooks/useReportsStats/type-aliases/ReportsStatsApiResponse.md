[**do-not-ghost-me**](../../../../README.md)

***

# Type Alias: ReportsStatsApiResponse

> **ReportsStatsApiResponse** = `object`

Defined in: [src/app/\_hooks/useReportsStats.ts:29](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_hooks/useReportsStats.ts#L29)

Response shape returned by GET /api/reports/stats.

## Properties

### mostReportedCompany

> **mostReportedCompany**: [`MostReportedCompany`](MostReportedCompany.md) \| `null`

Defined in: [src/app/\_hooks/useReportsStats.ts:38](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_hooks/useReportsStats.ts#L38)

Most reported company this week or null when no data exists.

***

### totalReports

> **totalReports**: `number`

Defined in: [src/app/\_hooks/useReportsStats.ts:33](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_hooks/useReportsStats.ts#L33)

Total number of ACTIVE reports across all time.
