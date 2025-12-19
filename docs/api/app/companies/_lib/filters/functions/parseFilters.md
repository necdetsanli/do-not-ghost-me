[**do-not-ghost-me**](../../../../../README.md)

***

# Function: parseFilters()

> **parseFilters**(`searchParams?`): `ResolvedFilters`

Defined in: [src/app/companies/\_lib/filters.ts:26](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/companies/_lib/filters.ts#L26)

Parse and sanitise raw search parameters from the URL.

This is the single place where we trust query-string input and convert it
into a strongly typed ResolvedFilters object used by the data layer.

## Parameters

### searchParams?

`SearchParams`

Raw URL search parameters as provided by Next.js
                      (all values are strings or undefined).

## Returns

`ResolvedFilters`

A ResolvedFilters object with:
         - page clamped to [1, MAX_PAGE],
         - search truncated and normalised,
         - enum-like filters (country, category, seniority, stage) resolved
           from their slug or query representation.
