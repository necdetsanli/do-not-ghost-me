[**do-not-ghost-me**](../../../../../README.md)

***

# Function: parseFilters()

> **parseFilters**(`searchParams?`): `ResolvedFilters`

Defined in: [src/app/top-companies/\_lib/filters.ts:26](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/app/top-companies/_lib/filters.ts#L26)

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
