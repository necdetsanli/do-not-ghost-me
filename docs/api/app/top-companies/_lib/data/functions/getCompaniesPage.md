[**do-not-ghost-me**](../../../../../README.md)

***

# Function: getCompaniesPage()

> **getCompaniesPage**(`filters`): `Promise`\<\{ `items`: `TopCompanyRow`[]; `totalCompanies`: `number`; `totalPages`: `number`; \}\>

Defined in: [src/app/top-companies/\_lib/data.ts:29](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/app/top-companies/_lib/data.ts#L29)

Fetch one page of "top companies" and basic pagination metadata.

The query:
- applies the given filters on the Report table (and related Company),
- groups reports by companyId,
- orders groups by descending report count,
- loads company names and country for the page's companyIds,
- computes total group count for pagination.

## Parameters

### filters

`ResolvedFilters`

Resolved and validated filters (page, search, country,
                 positionCategory, seniority, stage) used to restrict the
                 underlying Report/Company query.

## Returns

`Promise`\<\{ `items`: `TopCompanyRow`[]; `totalCompanies`: `number`; `totalPages`: `number`; \}\>

A promise that resolves to an object containing:
         - items: current page rows with company id, name, country and
           aggregated report count,
         - totalPages: total number of pages given PAGE_SIZE,
         - totalCompanies: total number of (company, country) rows that match
           the filters.

## Throws

If a company record is unexpectedly missing for a grouped
                companyId while building the page.
