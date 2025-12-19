[**do-not-ghost-me**](../../../../../README.md)

***

# Function: getCompaniesPage()

> **getCompaniesPage**(`filters`): `Promise`\<\{ `items`: `CompanyRow`[]; `totalCompanies`: `number`; `totalPages`: `number`; \}\>

Defined in: [src/app/companies/\_lib/data.ts:61](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/companies/_lib/data.ts#L61)

Fetch one page of "companies" and basic pagination metadata.

Important ordering note:
To guarantee stable pagination, we apply the full ordering BEFORE slicing:
- reportCount DESC
- normalized company name ASC
- id ASC

This avoids unstable tie ordering that can cause rows to "jump" between pages.

## Parameters

### filters

`ResolvedFilters`

Resolved and validated filters (page, search, country,
                 positionCategory, seniority, stage) used to restrict the
                 underlying Report/Company query.

## Returns

`Promise`\<\{ `items`: `CompanyRow`[]; `totalCompanies`: `number`; `totalPages`: `number`; \}\>

A promise that resolves to an object containing:
         - items: current page rows with company id, name, country and
           aggregated report count,
         - totalPages: total number of pages given PAGE_SIZE,
         - totalCompanies: total number of companies that match the filters.

## Throws

If a company record is unexpectedly missing for a grouped
                companyId while building the page.
