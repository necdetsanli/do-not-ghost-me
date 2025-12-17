[**do-not-ghost-me**](../../../README.md)

***

# Function: findOrCreateCompanyForReport()

> **findOrCreateCompanyForReport**(`args`): `Promise`\<[`CompanyForReport`](../type-aliases/CompanyForReport.md)\>

Defined in: [src/lib/company.ts:46](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/company.ts#L46)

Find or create a company for a given report payload.

Behavior:
- Normalizes the company name into a canonical `normalizedName` key.
- Uses (normalizedName, country) as the lookup key.
- Reuses an existing company row if that pair already exists.
- Creates a new company otherwise.

Concurrency hardening:
- First attempts a read (findUnique).
- If no row exists, attempts a create.
- If the create hits a unique constraint (P2002), it re-reads the row and
  returns the existing company instead of bubbling up a 500.

## Parameters

### args

Input payload coming from a validated report.

#### companyName

`string`

Company name as provided by the user.

#### country

`CountryCode`

CountryCode for this report (and company scope).

## Returns

`Promise`\<[`CompanyForReport`](../type-aliases/CompanyForReport.md)\>

The existing or newly created company record with id, name, normalizedName and country.

## Throws

If the normalized company name is empty or if the database layer
fails in a non-recoverable way.
