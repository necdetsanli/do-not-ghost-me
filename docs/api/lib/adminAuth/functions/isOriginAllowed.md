[**do-not-ghost-me**](../../../README.md)

***

# Function: isOriginAllowed()

> **isOriginAllowed**(`req`): `boolean`

Defined in: [src/lib/adminAuth.ts:289](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/adminAuth.ts#L289)

Returns true if the request origin is allowed for the admin surface.

This is a defense-in-depth check against CSRF and cross-site requests.

Rules:
- If ADMIN_ALLOWED_HOST is not configured, origin checks are disabled (allow all).
- For safe methods (GET/HEAD/OPTIONS), missing Origin/Referer is allowed.
- For non-safe methods (POST/PUT/PATCH/DELETE), Origin or Referer must match the expected admin origin.

Expected admin origin is derived from:
- protocol: x-forwarded-proto header when present, otherwise req.nextUrl.protocol
- host: ADMIN_ALLOWED_HOST

## Parameters

### req

`NextRequest`

Incoming NextRequest.

## Returns

`boolean`

True when origin is allowed, false otherwise.
