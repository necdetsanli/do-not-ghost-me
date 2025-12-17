[**do-not-ghost-me**](../../../README.md)

***

# Function: getUtcWeekStart()

> **getUtcWeekStart**(`date`): `Date`

Defined in: [src/lib/dates.ts:52](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/dates.ts#L52)

Returns the start of the current week in UTC (Monday 00:00:00.000).

Week definition: Monday -> next Monday, based on UTC.

## Parameters

### date

`Date`

Any date within the target week.

## Returns

`Date`

A Date representing Monday 00:00 UTC of the same week.
