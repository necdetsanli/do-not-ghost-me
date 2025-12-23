// tests/integration/api.admin.logout.test.ts
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockEnv = {
  /**
   * Optional host restriction for admin endpoints.
   * When set, admin APIs only accept requests whose Host header matches this value.
   */
  ADMIN_ALLOWED_HOST?: string | null;
};

type CookieOptions = {
  /**
   * Cookie name.
   */
  name: string;

  /**
   * Marks cookie as HttpOnly.
   */
  httpOnly: boolean;

  /**
   * Marks cookie as Secure.
   */
  secure: boolean;

  /**
   * SameSite policy.
   */
  sameSite: "strict" | "lax" | "none";

  /**
   * Cookie path.
   */
  path: string;

  /**
   * Cookie max age in seconds.
   */
  maxAge: number;
};

const { envMock, adminSessionCookieOptionsMock, logInfoMock, logWarnMock } = vi.hoisted(() => {
  const env: MockEnv = {};

  return {
    envMock: env,
    adminSessionCookieOptionsMock: vi.fn<() => CookieOptions>(),
    logInfoMock: vi.fn(),
    logWarnMock: vi.fn(),
  };
});

vi.mock("@/env", () => ({
  env: envMock,
}));

vi.mock("@/lib/adminAuth", () => ({
  adminSessionCookieOptions: adminSessionCookieOptionsMock,
  isAllowedAdminHost: (req: NextRequest) => {
    const required = envMock.ADMIN_ALLOWED_HOST;
    if (required === undefined || required === null || required.trim().length === 0) {
      return true;
    }
    const host = req.headers.get("host") ?? "";
    return host === required.trim();
  },
}));

vi.mock("@/lib/logger", () => ({
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}));

import { POST } from "@/app/api/admin/logout/route";

/**
 * Default request URL for the logout endpoint.
 */
const LOGOUT_URL = "http://localhost:3000/api/admin/logout";

/**
 * Creates a NextRequest for POST /api/admin/logout with customizable headers.
 *
 * @param args - Request configuration.
 * @param args.url - Full request URL (used as base URL in NextRequest).
 * @param args.hostHeader - Optional Host header value. If omitted, no Host header is set.
 * @param args.originHeader - Optional Origin header value. (Not used by the route but kept for realism.)
 * @returns A NextRequest instance configured for logout.
 */
function makeLogoutRequest(args?: {
  url?: string;
  hostHeader?: string;
  originHeader?: string;
}): NextRequest {
  const url: string = args?.url ?? LOGOUT_URL;

  const headers = new Headers();

  if (typeof args?.hostHeader === "string") {
    headers.set("host", args.hostHeader);
  }

  if (typeof args?.originHeader === "string") {
    headers.set("origin", args.originHeader);
  }

  return new NextRequest(url, {
    method: "POST",
    headers,
  });
}

/**
 * Returns a deterministic cookie options object for tests.
 *
 * @param overrides - Partial overrides for cookie options.
 * @returns CookieOptions used by adminSessionCookieOptions mock.
 */
function cookieOpts(overrides?: Partial<CookieOptions>): CookieOptions {
  return {
    name: "__Host-dg_admin",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 1800,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: no ADMIN_ALLOWED_HOST configured (allows any host).
  delete envMock.ADMIN_ALLOWED_HOST;

  adminSessionCookieOptionsMock.mockReturnValue(cookieOpts());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/logout", () => {
  it("returns 403 JSON when ADMIN_ALLOWED_HOST is set and Host header does not match", async () => {
    envMock.ADMIN_ALLOWED_HOST = "example.test";

    const req = makeLogoutRequest({
      url: "http://example.test/api/admin/logout",
      hostHeader: "evil.example.com",
      originHeader: "http://evil.example.com",
    });

    const res = POST(req);

    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json).toEqual({
      error: "Admin access is not allowed from this host.",
    });

    expect(adminSessionCookieOptionsMock).not.toHaveBeenCalled();
    expect(logInfoMock).not.toHaveBeenCalled();
    expect(logWarnMock).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when ADMIN_ALLOWED_HOST is set but Host header is missing", async () => {
    envMock.ADMIN_ALLOWED_HOST = "example.test";

    const req = makeLogoutRequest({
      url: "http://example.test/api/admin/logout",
      // Intentionally omit host header.
      originHeader: "http://example.test",
    });

    const res = POST(req);

    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json).toEqual({
      error: "Admin access is not allowed from this host.",
    });

    expect(adminSessionCookieOptionsMock).not.toHaveBeenCalled();
    expect(logInfoMock).not.toHaveBeenCalled();
    expect(logWarnMock).toHaveBeenCalledTimes(1);
  });

  it("allows any host when ADMIN_ALLOWED_HOST is not set (undefined)", async () => {
    // No ADMIN_ALLOWED_HOST set.
    delete envMock.ADMIN_ALLOWED_HOST;

    const req = makeLogoutRequest({
      url: "http://example.test/api/admin/logout",
      hostHeader: "evil.example.com",
    });

    const res = POST(req);

    expect(res.status).toBe(200);

    const json = (await res.json()) as { success?: boolean };
    expect(json).toEqual({ success: true });

    expect(adminSessionCookieOptionsMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).not.toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledTimes(1);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Host-dg_admin=");
    expect(setCookie.toLowerCase()).toContain("max-age=0");
    expect(setCookie).toContain("Path=/");
  });

  describe("host matrix (current behavior)", () => {
    it("allows logout when ADMIN_ALLOWED_HOST matches Host header", async () => {
      envMock.ADMIN_ALLOWED_HOST = "example.test";

      const req = makeLogoutRequest({
        url: "http://example.test/api/admin/logout",
        hostHeader: "example.test",
      });

      const res = POST(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { success?: boolean };
      expect(json.success).toBe(true);
    });

    it("denies logout when Host mismatches ADMIN_ALLOWED_HOST", async () => {
      envMock.ADMIN_ALLOWED_HOST = "example.test";

      const req = makeLogoutRequest({
        url: "http://example.test/api/admin/logout",
        hostHeader: "evil.test",
      });

      const res = POST(req);
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error?: string };
      expect(json.error).toBe("Admin access is not allowed from this host.");
    });

    it("allows logout when ADMIN_ALLOWED_HOST is unset", async () => {
      delete envMock.ADMIN_ALLOWED_HOST;

      const req = makeLogoutRequest({
        url: "http://example.test/api/admin/logout",
        hostHeader: "evil.test",
      });

      const res = POST(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { success?: boolean };
      expect(json.success).toBe(true);
    });
  });

  it("allows any host when ADMIN_ALLOWED_HOST is whitespace-only (trimmed empty)", async () => {
    envMock.ADMIN_ALLOWED_HOST = "   ";

    const req = makeLogoutRequest({
      url: "http://example.test/api/admin/logout",
      hostHeader: "evil.example.com",
    });

    const res = POST(req);

    expect(res.status).toBe(200);

    const json = (await res.json()) as { success?: boolean };
    expect(json).toEqual({ success: true });

    expect(adminSessionCookieOptionsMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).not.toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledTimes(1);
  });

  it("allows any host when ADMIN_ALLOWED_HOST is null (defensive branch)", async () => {
    // This covers the runtime defensive branch: allowedHost === null.
    (envMock as unknown as { ADMIN_ALLOWED_HOST: null }).ADMIN_ALLOWED_HOST = null;

    const req = makeLogoutRequest({
      url: "http://example.test/api/admin/logout",
      hostHeader: "evil.example.com",
    });

    const res = POST(req);

    expect(res.status).toBe(200);

    const json = (await res.json()) as { success?: boolean };
    expect(json).toEqual({ success: true });

    expect(adminSessionCookieOptionsMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).not.toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledTimes(1);
  });

  it("clears the admin session cookie with maxAge=0 and preserves cookie policy flags", async () => {
    envMock.ADMIN_ALLOWED_HOST = "localhost:3000";

    adminSessionCookieOptionsMock.mockReturnValue(
      cookieOpts({
        name: "__Host-dg_admin",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 1800,
      }),
    );

    const req = makeLogoutRequest({
      url: LOGOUT_URL,
      hostHeader: "localhost:3000",
      originHeader: "http://localhost:3000",
    });

    const res = POST(req);

    expect(res.status).toBe(200);

    const json = (await res.json()) as { success?: boolean };
    expect(json).toEqual({ success: true });

    const setCookie = res.headers.get("set-cookie") ?? "";

    // Cookie name/value cleared.
    expect(setCookie).toContain("__Host-dg_admin=");

    // Explicitly expire the cookie.
    expect(setCookie.toLowerCase()).toContain("max-age=0");

    // Policy attributes should remain.
    expect(setCookie).toContain("Path=/");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=strict");
    expect(setCookie.toLowerCase()).toContain("secure");

    expect(logWarnMock).not.toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledTimes(1);
  });

  it("does not include Secure attribute when cookie options specify secure=false", async () => {
    envMock.ADMIN_ALLOWED_HOST = "localhost:3000";

    adminSessionCookieOptionsMock.mockReturnValue(
      cookieOpts({
        secure: false,
      }),
    );

    const req = makeLogoutRequest({
      url: LOGOUT_URL,
      hostHeader: "localhost:3000",
    });

    const res = POST(req);

    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).not.toContain("secure");
  });
});
