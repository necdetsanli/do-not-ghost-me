[**do-not-ghost-me**](../../../README.md)

***

# Function: enforceReportLimitForIpCompanyPosition()

> **enforceReportLimitForIpCompanyPosition**(`args`): `Promise`\<`void`\>

Defined in: [src/lib/rateLimit.ts:102](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/rateLimit.ts#L102)

Enforces IP-based rate limits for creating a report:

- A global per-day limit from this IP (across all companies).
- A per-company limit from this IP.
- At most one report per (company, positionCategory, positionDetail) per IP.

If a limit is reached, this function throws a ReportRateLimitError.
Database or network failures are rethrown as-is so that callers can
differentiate between rate-limit and infrastructure issues.

## Parameters

### args

`EnforceReportLimitArgs`

Arguments for rate limiting.

## Returns

`Promise`\<`void`\>

A promise that resolves when limits are within bounds.

## Throws

ReportRateLimitError If any rate limit is exceeded or IP is missing.
