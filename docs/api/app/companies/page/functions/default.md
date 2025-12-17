[**do-not-ghost-me**](../../../../README.md)

***

# Function: default()

> **default**(`__namedParameters`): `Promise`\<`Element`\>

Defined in: [src/app/companies/page.tsx:43](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/page.tsx#L43)

Server component entry point for the /companies route.

Responsibilities:
- Parse and normalise filter query parameters.
- Fetch the current page of aggregated company data.
- Compute pagination URLs based on the resolved filters.
- Compose presentational components for filters, table and pagination.

## Parameters

### \_\_namedParameters

`PageProps`

## Returns

`Promise`\<`Element`\>
