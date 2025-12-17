[**do-not-ghost-me**](../../../../README.md)

***

# Function: useReportsStats()

> **useReportsStats**(): `UseReportsStatsResult`

Defined in: [src/app/\_hooks/useReportsStats.ts:176](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_hooks/useReportsStats.ts#L176)

Loads /api/reports/stats and keeps the latest stats in state.

Behavior:
- Performs an initial fetch on mount.
- Refreshes on:
  - successful report submission event
  - window focus / document visibility change / pageshow (back-forward cache)
- Does NOT poll on an interval.

## Returns

`UseReportsStatsResult`

Stats state and controls for the caller UI.
