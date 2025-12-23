// src/app/api/health/route.ts
import type { NextRequest } from "next/server";
import { enforcePublicIpRateLimit, PublicRateLimitError } from "@/lib/publicRateLimit";
import { getClientIp } from "@/lib/ip";
import { CORRELATION_ID_HEADER, deriveCorrelationId } from "@/lib/correlation";

export const runtime = "nodejs";

const HEALTH_SCOPE = "health";
const HEALTH_WINDOW_MS = 60_000;
const HEALTH_MAX_REQUESTS_PER_WINDOW = 60;
const FALLBACK_IP = "0.0.0.0";

/**
 * Builds a JSON response with safe default headers.
 *
 * @param body - JSON-serializable response body.
 * @param status - HTTP status code.
 * @returns Response instance.
 */
function json(body: unknown, status: number, correlationId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      [CORRELATION_ID_HEADER]: correlationId,
    },
  });
}

/**
 * Derives a best-effort client IP for rate limiting.
 *
 * - Prefers the shared getClientIp() logic.
 * - Falls back to "0.0.0.0" when missing/unknown.
 *
 * @param req - Next.js request.
 * @returns A non-empty IP string.
 */
function getIpForRateLimit(req: NextRequest): string {
  const raw: string | null | undefined = getClientIp(req);

  if (typeof raw !== "string") {
    return FALLBACK_IP;
  }

  const trimmed: string = raw.trim();

  if (trimmed.length === 0) {
    return FALLBACK_IP;
  }

  if (trimmed.toLowerCase() === "unknown") {
    return FALLBACK_IP;
  }

  return trimmed;
}

/**
 * Public healthcheck endpoint.
 *
 * - Does NOT perform DB checks (process up only).
 * - Applies a per-IP in-memory rate limit to reduce abuse/DoS.
 *
 * @param req - Next.js request.
 * @returns Health JSON response.
 */
export function GET(req: NextRequest): Response {
  const correlationId = deriveCorrelationId(req);
  const ip: string = getIpForRateLimit(req);

  try {
    enforcePublicIpRateLimit({
      ip,
      scope: HEALTH_SCOPE,
      windowMs: HEALTH_WINDOW_MS,
      maxRequests: HEALTH_MAX_REQUESTS_PER_WINDOW,
    });
  } catch (error: unknown) {
    if (error instanceof PublicRateLimitError) {
      return json({ error: "Too many requests" }, error.statusCode, correlationId);
    }

    // Fail open for health: do not break uptime checks due to unexpected RL errors.
    return json({ status: "ok" }, 200, correlationId);
  }

  return json({ status: "ok" }, 200, correlationId);
}

/**
 * HEAD support for basic uptime monitors.
 *
 * @param req - Next.js request.
 * @returns Empty response with same status/headers.
 */
export function HEAD(req: NextRequest): Response {
  const res = GET(req);
  return new Response(null, { status: res.status, headers: res.headers });
}
