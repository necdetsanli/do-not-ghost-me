// tests/unit/ip.test.ts
import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";

/**
 * Builds a minimal NextRequest-like object for unit tests.
 *
 * This helper allows testing IP extraction behavior across:
 * - x-forwarded-for parsing
 * - x-real-ip fallback
 * - req.ip fallback (only when it is an own property)
 *
 * Note: This is intentionally not a real NextRequest instance; it only provides
 * the fields used by `getClientIp`.
 *
 * @param args - Optional request shaping arguments.
 * @returns A NextRequest-like object.
 */
function makeReq(args?: {
  xForwardedFor?: string | null;
  xRealIp?: string | null;
  ip?: string | null | undefined;
  ownIpProp?: boolean;
}): NextRequest {
  const headers = new Headers();

  if (args?.xForwardedFor !== undefined && args?.xForwardedFor !== null) {
    headers.set("x-forwarded-for", args.xForwardedFor);
  }
  if (args?.xRealIp !== undefined && args?.xRealIp !== null) {
    headers.set("x-real-ip", args.xRealIp);
  }

  const baseReq: Record<string, unknown> = { headers };

  if (args?.ownIpProp === false) {
    const proto = { ip: args?.ip };
    const obj = Object.create(proto) as Record<string, unknown>;
    obj.headers = headers;
    return obj as unknown as NextRequest;
  }

  if (args?.ip !== undefined) {
    baseReq.ip = args.ip;
  }

  return baseReq as unknown as NextRequest;
}

/**
 * Unit tests for lib/ip.getClientIp.
 *
 * Verifies:
 * - null when no usable sources exist
 * - priority order: X-Forwarded-For -> X-Real-IP -> req.ip
 * - strict validation of candidate IPs
 * - security: req.ip must be an own property (not inherited)
 */
describe("lib/ip.getClientIp", () => {
  /**
   * Ensures the function fails closed when it cannot determine a valid client IP.
   */
  it("returns null when no usable headers or req.ip exist", () => {
    const req = makeReq();
    expect(getClientIp(req)).toBeNull();
  });

  /**
   * Ensures parsing of X-Forwarded-For selects the first valid IP
   * (skipping empty and invalid parts).
   */
  it("prefers the first valid IP from X-Forwarded-For", () => {
    const req = makeReq({
      xForwardedFor: " , not-an-ip,  203.0.113.5 , 2001:db8::1 ",
    });

    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  /**
   * Ensures the function continues scanning forwarded-for parts until it finds a valid IP.
   */
  it("skips empty/invalid forwarded-for parts until it finds a valid IP", () => {
    const req = makeReq({
      xForwardedFor: "   , 999.999.999.999, 2001:db8::1",
    });

    expect(getClientIp(req)).toBe("2001:db8::1");
  });

  /**
   * Ensures X-Real-IP is used when X-Forwarded-For is missing or contains no valid IPs.
   */
  it("uses X-Real-IP when X-Forwarded-For is missing or unusable", () => {
    const req = makeReq({
      xForwardedFor: "not-an-ip, also-bad",
      xRealIp: "  192.0.2.10  ",
    });

    expect(getClientIp(req)).toBe("192.0.2.10");
  });

  /**
   * Ensures req.ip is only trusted when it is present as an own property and valid.
   */
  it("falls back to req.ip only when it is an own property and valid", () => {
    const req = makeReq({ ip: " 198.51.100.7 " });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  /**
   * Ensures invalid req.ip values are rejected.
   */
  it("returns null when req.ip exists but is invalid", () => {
    const req = makeReq({ ip: "not-an-ip" });
    expect(getClientIp(req)).toBeNull();
  });

  /**
   * Ensures prototype-polluted / inherited `ip` values are not trusted.
   * This is a defense-in-depth check against spoofing.
   */
  it("does not trust req.ip if it is only on the prototype (not an own property)", () => {
    const req = makeReq({
      ip: "203.0.113.99",
      ownIpProp: false,
    });

    expect(getClientIp(req)).toBeNull();
  });
});
