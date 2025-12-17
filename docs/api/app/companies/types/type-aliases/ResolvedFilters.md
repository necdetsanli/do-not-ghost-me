[**do-not-ghost-me**](../../../../README.md)

***

# Type Alias: ResolvedFilters

> **ResolvedFilters** = `object`

Defined in: [src/app/companies/types.ts:41](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L41)

Parsed and validated filters used by the data layer.
Fields are always present but may be undefined if no filter is active.

## Properties

### country

> **country**: `CountryCode` \| `undefined`

Defined in: [src/app/companies/types.ts:47](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L47)

Optional country filter (CountryCode enum)

***

### page

> **page**: `number`

Defined in: [src/app/companies/types.ts:43](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L43)

1-based page index, already clamped to [1, MAX_PAGE]

***

### positionCategory

> **positionCategory**: `PositionCategory` \| `undefined`

Defined in: [src/app/companies/types.ts:49](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L49)

Optional position category filter

***

### search

> **search**: `string` \| `undefined`

Defined in: [src/app/companies/types.ts:45](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L45)

Optional free-text company search

***

### seniority

> **seniority**: `JobLevel` \| `undefined`

Defined in: [src/app/companies/types.ts:51](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L51)

Optional seniority filter (JobLevel)

***

### stage

> **stage**: `Stage` \| `undefined`

Defined in: [src/app/companies/types.ts:53](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L53)

Optional pipeline stage filter
