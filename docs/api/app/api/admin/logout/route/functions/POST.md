[**do-not-ghost-me**](../../../../../../README.md)

***

# Function: POST()

> **POST**(`req`): `NextResponse`

Defined in: [src/app/api/admin/logout/route.ts:57](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/api/admin/logout/route.ts#L57)

Log out the current admin by clearing the session cookie.

This endpoint is API-only:
- It no longer performs any redirects.
- Clients are responsible for navigation after a successful logout.

## Parameters

### req

`NextRequest`

## Returns

`NextResponse`
