[**do-not-ghost-me**](../../../../../README.md)

***

# Function: getCompaniesPage()

> **getCompaniesPage**(`filters`): `Promise`\<\{ `items`: [`CompanyRow`](../../../types/type-aliases/CompanyRow.md)[]; `totalCompanies`: `number`; `totalPages`: `number`; \}\>

Defined in: [src/app/companies/\_lib/data.ts:61](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/_lib/data.ts#L61)

Fetch one page of "companies" and basic pagination metadata.

Important ordering note:
To guarantee stable pagination, we apply the full ordering BEFORE slicing:
- reportCount DESC
- normalized company name ASC
- id ASC

This avoids unstable tie ordering that can cause rows to "jump" between pages.

## Parameters

### filters

[`ResolvedFilters`](../../../types/type-aliases/ResolvedFilters.md)

Resolved and validated filters (page, search, country,
                 positionCategory, seniority, stage) used to restrict the
                 underlying Report/Company query.

## Returns

`Promise`\<\{ `items`: [`CompanyRow`](../../../types/type-aliases/CompanyRow.md)[]; `totalCompanies`: `number`; `totalPages`: `number`; \}\>

A promise that resolves to an object containing:
         - items: current page rows with company id, name, country and
           aggregated report count,
         - totalPages: total number of pages given PAGE_SIZE,
         - totalCompanies: total number of companies that match the filters.

## Throws

If a company record is unexpectedly missing for a grouped
                companyId while building the page.
