[**do-not-ghost-me**](../../../README.md)

***

# Function: getClientIp()

> **getClientIp**(`req`): `string` \| `null`

Defined in: [src/lib/ip.ts:49](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/ip.ts#L49)

Extracts the client IP address from a NextRequest in a proxy-aware way.

Resolution order:
1. "X-Forwarded-For" header (comma-separated list); uses the first non-empty, valid IP.
2. "X-Real-IP" header if present and valid.
3. As a last resort, uses req.ip if the runtime exposes it.

Important:
- This assumes the app is running behind a trusted reverse proxy that
  sets X-Forwarded-For / X-Real-IP correctly. In untrusted environments,
  these headers can be spoofed and must not be used for strong auth.

## Parameters

### req

`NextRequest`

The incoming Next.js request.

## Returns

`string` \| `null`

A normalized (trimmed) IP string or null if no usable IP could be determined.
