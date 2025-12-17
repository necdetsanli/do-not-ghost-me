[**do-not-ghost-me**](../../../../README.md)

***

# Function: HomeStatsPanel()

> **HomeStatsPanel**(): `Element`

Defined in: [src/app/\_components/HomeStatsPanel.tsx:24](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_components/HomeStatsPanel.tsx#L24)

Home page stats panel.

Responsibilities:
- Render stats UI.
- Delegate fetching behavior to `useReportsStats` (SRP).

NOTE:
- No polling is performed.
- Stats refresh only after a successful human report submission event.

## Returns

`Element`

The stats panel element.
