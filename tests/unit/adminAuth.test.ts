import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

type MockEnv = {
  NODE_ENV: "production" | "development" | "test";
  ADMIN_ALLOWED_HOST?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
};

type LoggerMocks = {
  logInfo: ReturnType<typeof vi.fn>;
  logWarn: ReturnType<typeof vi.fn>;
  logError: ReturnType<typeof vi.fn>;
};

function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signHmacSha256B64url(data: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  return b64urlEncode(hmac.digest());
}

function makeReq({
  url = "https://example.test/admin",
  method = "POST",
  host,
  origin,
  referer,
  proto,
  cookieValue,
}: {
  url?: string;
  method?: string;
  host?: string;
  origin?: string;
  referer?: string;
  proto?: "http" | "https";
  cookieValue?: string | null;
}): NextRequest {
  const headers = new Headers();

  if (host !== undefined) {
    headers.set("host", host);
  }
  if (origin !== undefined) {
    headers.set("origin", origin);
  }
  if (referer !== undefined) {
    headers.set("referer", referer);
  }
  if (proto !== undefined) {
    headers.set("x-forwarded-proto", proto);
  }

  const cookieStore = {
    get: (name: string): { value: string } | undefined => {
      if (name !== "dg_admin") {
        return undefined;
      }
      if (
        cookieValue === null ||
        cookieValue === undefined ||
        cookieValue === ""
      ) {
        return undefined;
      }
      return { value: cookieValue };
    },
  };

  const nextUrl = new URL(url);

  return {
    method,
    headers,
    nextUrl,
    cookies: cookieStore,
  } as unknown as NextRequest;
}

async function loadAdminAuth(envOverrides: Partial<MockEnv>) {
  vi.resetModules();

  const logger: LoggerMocks = {
    logInfo: vi.fn(),
    logWarn: vi.fn(),
    logError: vi.fn(),
  };

  const env: MockEnv = {
    NODE_ENV: "test",
    ADMIN_ALLOWED_HOST: "example.test",
    ADMIN_PASSWORD: "pw",
    ADMIN_SESSION_SECRET: "secret",
    ...envOverrides,
  };

  vi.doMock("@/lib/logger", () => logger);
  vi.doMock("@/env", () => ({ env }));

  const mod = await import("@/lib/adminAuth");
  return { mod, logger, env };
}

describe("adminAuth.verifyAdminPassword", () => {
  it("returns false and logs once when ADMIN_PASSWORD is missing", async () => {
    const { mod, logger } = await loadAdminAuth({ ADMIN_PASSWORD: undefined });

    const first = mod.verifyAdminPassword("anything");
    const second = mod.verifyAdminPassword("anything");

    expect(first).toBe(false);
    expect(second).toBe(false);

    expect(logger.logError).toHaveBeenCalledTimes(1);
  });

  it("returns false when candidate length differs from configured password", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "secret" });

    const spy = vi.spyOn(crypto, "timingSafeEqual");

    const ok = mod.verifyAdminPassword("x");
    expect(ok).toBe(false);

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it("returns true when passwords match exactly", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "secret" });

    const ok = mod.verifyAdminPassword("secret");
    expect(ok).toBe(true);
  });

  it("returns false when same-length passwords do not match", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "secret" });

    const ok = mod.verifyAdminPassword("secreu");
    expect(ok).toBe(false);
  });

  it("returns false when timingSafeEqual throws", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "secret" });

    const spy = vi.spyOn(crypto, "timingSafeEqual").mockImplementation(() => {
      throw new Error("boom");
    });

    const ok = mod.verifyAdminPassword("secret");
    expect(ok).toBe(false);

    spy.mockRestore();
  });
});

describe("adminAuth session token lifecycle", () => {
  it("creates and verifies a valid admin session token", async () => {
    const { mod } = await loadAdminAuth({
      NODE_ENV: "test",
      ADMIN_SESSION_SECRET: "secret",
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const token: string = mod.createAdminSessionToken();
    const payload = mod.verifyAdminSessionToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("admin");
    expect(typeof payload?.iat).toBe("number");
    expect(typeof payload?.exp).toBe("number");
    expect(payload?.exp).toBeGreaterThan(payload?.iat);

    vi.useRealTimers();
  });

  it("returns null for malformed tokens", async () => {
    const { mod, logger } = await loadAdminAuth({});

    const payload = mod.verifyAdminSessionToken("not-a-token");
    expect(payload).toBeNull();

    expect(logger.logWarn).toHaveBeenCalledTimes(1);
  });

  it("returns null for empty payload/signature parts", async () => {
    const { mod, logger } = await loadAdminAuth({});

    const payload = mod.verifyAdminSessionToken("abc.");
    expect(payload).toBeNull();

    expect(logger.logWarn).toHaveBeenCalledTimes(1);
  });

  it("returns null when signature mismatch occurs", async () => {
    const { mod, logger } = await loadAdminAuth({
      ADMIN_SESSION_SECRET: "secret",
    });

    const token: string = mod.createAdminSessionToken();
    const parts: string[] = token.split(".");
    expect(parts.length).toBe(2);

    const tampered = `${parts[0]}.${b64urlEncode("wrong")}`;
    const payload = mod.verifyAdminSessionToken(tampered);

    expect(payload).toBeNull();
    expect(logger.logWarn).toHaveBeenCalled();
  });

  it("returns null for invalid JSON payload even if signature is valid", async () => {
    const { mod, logger, env } = await loadAdminAuth({
      ADMIN_SESSION_SECRET: "secret",
    });

    const payloadB64 = b64urlEncode("not-json");
    const sig = signHmacSha256B64url(
      payloadB64,
      env.ADMIN_SESSION_SECRET ?? "secret",
    );
    const token = `${payloadB64}.${sig}`;

    const payload = mod.verifyAdminSessionToken(token);

    expect(payload).toBeNull();
    expect(logger.logWarn).toHaveBeenCalled();
  });

  it("returns null for invalid subject", async () => {
    const { mod, logger, env } = await loadAdminAuth({
      ADMIN_SESSION_SECRET: "secret",
    });

    const now = Math.floor(Date.now() / 1000);
    const badPayload = { sub: "user", iat: now, exp: now + 1000 };
    const payloadB64 = b64urlEncode(JSON.stringify(badPayload));
    const sig = signHmacSha256B64url(
      payloadB64,
      env.ADMIN_SESSION_SECRET ?? "secret",
    );
    const token = `${payloadB64}.${sig}`;

    const payload = mod.verifyAdminSessionToken(token);

    expect(payload).toBeNull();
    expect(logger.logWarn).toHaveBeenCalled();
  });

  it("returns null for expired tokens", async () => {
    const { mod, logger, env } = await loadAdminAuth({
      ADMIN_SESSION_SECRET: "secret",
    });

    const now = Math.floor(Date.now() / 1000);
    const expiredPayload = { sub: "admin", iat: now - 100, exp: now - 1 };
    const payloadB64 = b64urlEncode(JSON.stringify(expiredPayload));
    const sig = signHmacSha256B64url(
      payloadB64,
      env.ADMIN_SESSION_SECRET ?? "secret",
    );
    const token = `${payloadB64}.${sig}`;

    const payload = mod.verifyAdminSessionToken(token);

    expect(payload).toBeNull();
    expect(logger.logWarn).toHaveBeenCalled();
  });

  it("returns null and logs when ADMIN_SESSION_SECRET is missing (signing misconfiguration)", async () => {
    const { mod, logger } = await loadAdminAuth({
      ADMIN_SESSION_SECRET: undefined,
    });

    const payload = mod.verifyAdminSessionToken("abc.def");

    expect(payload).toBeNull();
    expect(logger.logError).toHaveBeenCalled();

    const firstCallCount = logger.logError.mock.calls.length;

    mod.verifyAdminSessionToken("abc.def");

    const secondCallCount = logger.logError.mock.calls.length;
    expect(secondCallCount).toBeGreaterThan(firstCallCount);
  });
});

describe("adminAuth host/origin checks", () => {
  it("allows all hosts when ADMIN_ALLOWED_HOST is not set", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: undefined });

    const req = makeReq({ host: "evil.example.com" });
    const ok = mod.isAllowedAdminHost(req);

    expect(ok).toBe(true);
  });

  it("enforces exact host match when ADMIN_ALLOWED_HOST is set", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const ok1 = mod.isAllowedAdminHost(makeReq({ host: "example.test" }));
    const ok2 = mod.isAllowedAdminHost(makeReq({ host: "evil.example.com" }));

    expect(ok1).toBe(true);
    expect(ok2).toBe(false);
  });

  it("allows origin when it matches expected admin origin", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const req = makeReq({
      host: "example.test",
      proto: "https",
      origin: "https://example.test",
      method: "POST",
    });

    const ok = mod.isOriginAllowed(req);
    expect(ok).toBe(true);
  });

  it("allows referer fallback when origin is missing", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const req = makeReq({
      host: "example.test",
      proto: "https",
      referer: "https://example.test/admin/login",
      method: "POST",
    });

    const ok = mod.isOriginAllowed(req);
    expect(ok).toBe(true);
  });

  it("denies non-safe methods when origin and referer are missing", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const req = makeReq({
      host: "example.test",
      proto: "https",
      method: "POST",
    });

    const ok = mod.isOriginAllowed(req);
    expect(ok).toBe(false);
  });

  it("allows safe methods even when origin and referer are missing", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const req = makeReq({
      host: "example.test",
      proto: "https",
      method: "GET",
    });

    const ok = mod.isOriginAllowed(req);
    expect(ok).toBe(true);
  });
});

describe("adminAuth.requireAdminRequest", () => {
  it("throws when host is not allowed", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const req = makeReq({
      host: "evil.example.com",
      proto: "https",
      origin: "https://evil.example.com",
      method: "POST",
      cookieValue: "x",
    });

    expect(() => mod.requireAdminRequest(req)).toThrow(
      "Admin access is not allowed from this host.",
    );
  });

  it("throws when session is missing/invalid", async () => {
    const { mod } = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "example.test" });

    const req = makeReq({
      host: "example.test",
      proto: "https",
      origin: "https://example.test",
      method: "POST",
      cookieValue: null,
    });

    expect(() => mod.requireAdminRequest(req)).toThrow(
      "Missing or invalid admin session.",
    );
  });

  it("returns payload when request is authorized", async () => {
    const { mod, logger } = await loadAdminAuth({
      ADMIN_ALLOWED_HOST: "example.test",
      ADMIN_SESSION_SECRET: "secret",
    });

    const token: string = mod.createAdminSessionToken();

    const req = makeReq({
      host: "example.test",
      proto: "https",
      origin: "https://example.test",
      method: "POST",
      cookieValue: token,
    });

    const payload = mod.requireAdminRequest(req);

    expect(payload.sub).toBe("admin");
    expect(logger.logInfo).toHaveBeenCalled();
  });
});

describe("adminAuth cookie helpers", () => {
  it("returns standardized cookie options", async () => {
    const { mod } = await loadAdminAuth({ NODE_ENV: "test" });

    const opts = mod.adminSessionCookieOptions();

    expect(opts.name).toBe("dg_admin");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("strict");
    expect(opts.path).toBe("/");
    expect(typeof opts.maxAge).toBe("number");
  });

  it("attaches admin session cookie to response", async () => {
    const { mod } = await loadAdminAuth({});

    const cookiesSet = vi.fn();
    const res = { cookies: { set: cookiesSet } } as unknown as NextResponse;

    const out = mod.withAdminSessionCookie(res, "token");

    expect(out).toBe(res);
    expect(cookiesSet).toHaveBeenCalledTimes(1);

    const callArg = cookiesSet.mock.calls[0]?.[0] as unknown as {
      name: string;
      value: string;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
      path: string;
      maxAge: number;
    };

    expect(callArg.name).toBe("dg_admin");
    expect(callArg.value).toBe("token");
    expect(callArg.httpOnly).toBe(true);
    expect(callArg.sameSite).toBe("strict");
    expect(callArg.path).toBe("/");
    expect(typeof callArg.maxAge).toBe("number");
  });
});
