[**do-not-ghost-me**](../../../README.md)

***

# Function: enforceReportLimitForIpCompanyPosition()

> **enforceReportLimitForIpCompanyPosition**(`args`): `Promise`\<`void`\>

Defined in: [src/lib/rateLimit.ts:104](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/rateLimit.ts#L104)

Enforces IP-based rate limits for creating a report:

- A global per-day limit from this IP (across all companies).
- A per-company limit from this IP.
- At most one report per (company, positionCategory, positionDetail) per IP.

If a limit is reached, this function throws a ReportRateLimitError.
Database or network failures are rethrown as-is so that callers can
differentiate between rate-limit and infrastructure issues.

Concurrency notes:
- Daily counting is done via UPSERT (atomic) and validated after the increment.
- Per-company counting is protected by a PostgreSQL advisory transaction lock
  on (ipHash, companyId) to make count+insert strict under concurrency.

## Parameters

### args

`EnforceReportLimitArgs`

Arguments for rate limiting.

## Returns

`Promise`\<`void`\>

A promise that resolves when limits are within bounds.

## Throws

ReportRateLimitError If any rate limit is exceeded or IP is missing.
