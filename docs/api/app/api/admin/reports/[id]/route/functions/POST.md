[**do-not-ghost-me**](../../../../../../../README.md)

***

# Function: POST()

> **POST**(`request`, `context`): `Promise`\<`NextResponse`\<`unknown`\>\>

Defined in: [src/app/api/admin/reports/\[id\]/route.ts:66](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/app/api/admin/reports/[id]/route.ts#L66)

Handle admin moderation actions for a single report.

Supported actions:
- "flag"        → status=FLAGGED, flaggedAt=now, flaggedReason (optional)
- "restore"     → status=ACTIVE, clears flagged/deleted metadata
- "delete"      → soft delete (status=DELETED, deletedAt=now)
- "hard-delete" → hard delete (DELETE FROM report WHERE id = ?)

All actions:
- require a valid admin session cookie
- enforce optional ADMIN_ALLOWED_HOST host restriction (via requireAdminRequest)
- redirect back to /admin on success

## Parameters

### request

`NextRequest`

Incoming Next.js request containing form data.

### context

`AdminReportRouteContext`

Route context with a lazy params Promise (Next 15).

## Returns

`Promise`\<`NextResponse`\<`unknown`\>\>

A redirect response on success or JSON error on failure.
