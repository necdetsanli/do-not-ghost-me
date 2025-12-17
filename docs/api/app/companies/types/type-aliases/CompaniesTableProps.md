[**do-not-ghost-me**](../../../../README.md)

***

# Type Alias: CompaniesTableProps

> **CompaniesTableProps** = `object`

Defined in: [src/app/companies/types.ts:91](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L91)

Props for the main results table.

## Properties

### items

> **items**: [`CompanyRow`](CompanyRow.md)[]

Defined in: [src/app/companies/types.ts:93](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L93)

Rows to render on the current page

***

### page

> **page**: `number`

Defined in: [src/app/companies/types.ts:95](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L95)

Current page index (1-based), used to compute the row number column

***

### pageSize

> **pageSize**: `number`

Defined in: [src/app/companies/types.ts:97](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L97)

Page size used for pagination, needed to compute absolute row numbers
