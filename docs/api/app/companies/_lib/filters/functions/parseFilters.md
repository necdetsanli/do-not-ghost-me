[**do-not-ghost-me**](../../../../../README.md)

***

# Function: parseFilters()

> **parseFilters**(`searchParams?`): [`ResolvedFilters`](../../../types/type-aliases/ResolvedFilters.md)

Defined in: [src/app/companies/\_lib/filters.ts:26](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/_lib/filters.ts#L26)

Parse and sanitise raw search parameters from the URL.

This is the single place where we trust query-string input and convert it
into a strongly typed ResolvedFilters object used by the data layer.

## Parameters

### searchParams?

[`SearchParams`](../../../types/type-aliases/SearchParams.md)

Raw URL search parameters as provided by Next.js
                      (all values are strings or undefined).

## Returns

[`ResolvedFilters`](../../../types/type-aliases/ResolvedFilters.md)

A ResolvedFilters object with:
         - page clamped to [1, MAX_PAGE],
         - search truncated and normalised,
         - enum-like filters (country, category, seniority, stage) resolved
           from their slug or query representation.
