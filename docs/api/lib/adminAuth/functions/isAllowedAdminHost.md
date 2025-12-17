[**do-not-ghost-me**](../../../README.md)

***

# Function: isAllowedAdminHost()

> **isAllowedAdminHost**(`req`): `boolean`

Defined in: [src/lib/adminAuth.ts:260](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/adminAuth.ts#L260)

Returns true if this request is allowed to touch the admin surface
from a host perspective (based on ADMIN_ALLOWED_HOST).

When ADMIN_ALLOWED_HOST is not set or empty, all hosts are allowed.

## Parameters

### req

`NextRequest`

Incoming NextRequest.

## Returns

`boolean`

True when the host is allowed, false otherwise.
