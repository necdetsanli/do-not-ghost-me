// src/lib/ip.ts
import type { NextRequest } from "next/server";

/**
 * Normalize a potential IP string:
 * - returns a trimmed string if it is non-empty,
 * - returns null for null, undefined, or empty strings.
 */
function normalizeIpString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

/**
 * Extracts the client IP address from a NextRequest in a proxy-aware way.
 *
 * 1. Tries the standard "X-Forwarded-For" header (comma-separated list);
 *    uses the first non-empty value.
 * 2. Falls back to "X-Real-IP" if present.
 * 3. As a last resort, uses req.ip if the runtime exposes it.
 *
 * Returns a normalized (trimmed) IP string or null if no usable IP could be
 * determined.
 */
export function getClientIp(req: NextRequest): string | null {
  const xForwardedFor = req.headers.get("x-forwarded-for");

  if (xForwardedFor !== null) {
    // Format is usually: "client, proxy1, proxy2"
    const [first] = xForwardedFor.split(",");
    const normalized = normalizeIpString(first);

    if (normalized !== null) {
      return normalized;
    }
  }

  const realIpHeader = req.headers.get("x-real-ip");
  const realIp = normalizeIpString(realIpHeader);

  if (realIp !== null) {
    return realIp;
  }

  // Some Next.js runtimes may expose req.ip, but it is not guaranteed.
  // We treat it as a best-effort fallback.
  const requestWithIp = req as { ip?: string | null | undefined };

  if (Object.prototype.hasOwnProperty.call(requestWithIp, "ip")) {
    const normalized = normalizeIpString(requestWithIp.ip);

    if (normalized !== null) {
      return normalized;
    }
  }

  // No trustworthy IP found
  return null;
}
