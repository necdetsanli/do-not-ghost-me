[**do-not-ghost-me**](../../../../../README.md)

***

# Function: buildPageUrl()

> **buildPageUrl**(`base`, `page`, `filters`): `string`

Defined in: [src/app/companies/\_lib/url.ts:21](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/companies/_lib/url.ts#L21)

Build a URL for a given page, preserving existing filter query parameters.

This is used by the Companies pagination controls to:
- switch pages while keeping the current filters,
- keep the URL as the single source of truth for filter state.

## Parameters

### base

`string`

Base pathname for the route (for example, "/companies").

### page

`number`

1-based page index that should be navigated to.

### filters

[`ResolvedFilters`](../../../types/type-aliases/ResolvedFilters.md)

Current resolved filters whose values should be encoded into the query string.

## Returns

`string`

A relative URL (pathname + query string) for the requested page and filters.
