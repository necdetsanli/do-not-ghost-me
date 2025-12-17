[**do-not-ghost-me**](../../../../README.md)

***

# Type Alias: CompanyRow

> **CompanyRow** = `object`

Defined in: [src/app/companies/types.ts:13](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L13)

Shape of a single row in the "Top companies" table.
Each row represents a (company, country) pair with an aggregated report count.

## Properties

### country

> **country**: `CountryCode`

Defined in: [src/app/companies/types.ts:19](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L19)

ISO 3166-1 alpha-2 country code for this slice of reports

***

### id

> **id**: `string`

Defined in: [src/app/companies/types.ts:15](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L15)

ID of the company (Company.id)

***

### name

> **name**: `string`

Defined in: [src/app/companies/types.ts:17](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L17)

Human-readable company name

***

### reportsCount

> **reportsCount**: `number`

Defined in: [src/app/companies/types.ts:21](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/types.ts#L21)

Total number of reports for this (company, country) pair
