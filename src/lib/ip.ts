// src/lib/ip.ts
import net from "node:net";
import type { NextRequest } from "next/server";

/**
 * Normalizes a potential IP string:
 * - Trims whitespace.
 * - Ensures the value looks like a valid IPv4/IPv6 address.
 * - Returns null for null, undefined, empty, or invalid strings.
 *
 * @param value - The raw IP string value, or null/undefined.
 * @returns A trimmed IP string, or null if not usable.
 */
function normalizeIpString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Accept only values that parse as valid IPv4/IPv6.
  if (net.isIP(trimmed) === 0) {
    return null;
  }

  return trimmed;
}

/**
 * Extracts the client IP address from a NextRequest in a proxy-aware way.
 *
 * Resolution order:
 * 1. "X-Forwarded-For" header (comma-separated list); uses the first non-empty value.
 * 2. "X-Real-IP" header if present.
 * 3. As a last resort, uses req.ip if the runtime exposes it.
 *
 * @param req - The incoming Next.js request.
 * @returns A normalized (trimmed) IP string or null if no usable IP could be determined.
 * Important:
 * - This assumes the app is running behind a trusted reverse proxy that
 *   sets X-Forwarded-For / X-Real-IP correctly. In untrusted environments,
 *   these headers can be spoofed and must not be used for strong auth.
 */
export function getClientIp(req: NextRequest): string | null {
  const xForwardedFor = req.headers.get("x-forwarded-for");

  if (xForwardedFor !== null) {
    // Format is usually: "client, proxy1, proxy2".
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

  // No trustworthy IP found.
  return null;
}
