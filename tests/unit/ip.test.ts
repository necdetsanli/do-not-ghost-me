// tests/unit/ip.test.ts
import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";

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

describe("lib/ip.getClientIp", () => {
  it("returns null when no usable headers or req.ip exist", () => {
    const req = makeReq();
    expect(getClientIp(req)).toBeNull();
  });

  it("prefers the first valid IP from X-Forwarded-For", () => {
    const req = makeReq({
      xForwardedFor: " , not-an-ip,  203.0.113.5 , 2001:db8::1 ",
    });

    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("skips empty/invalid forwarded-for parts until it finds a valid IP", () => {
    const req = makeReq({
      xForwardedFor: "   , 999.999.999.999, 2001:db8::1",
    });

    expect(getClientIp(req)).toBe("2001:db8::1");
  });

  it("uses X-Real-IP when X-Forwarded-For is missing or unusable", () => {
    const req = makeReq({
      xForwardedFor: "not-an-ip, also-bad",
      xRealIp: "  192.0.2.10  ",
    });

    expect(getClientIp(req)).toBe("192.0.2.10");
  });

  it("falls back to req.ip only when it is an own property and valid", () => {
    const req = makeReq({ ip: " 198.51.100.7 " });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("returns null when req.ip exists but is invalid", () => {
    const req = makeReq({ ip: "not-an-ip" });
    expect(getClientIp(req)).toBeNull();
  });

  it("does not trust req.ip if it is only on the prototype (not an own property)", () => {
    const req = makeReq({
      ip: "203.0.113.99",
      ownIpProp: false,
    });

    expect(getClientIp(req)).toBeNull();
  });
});
