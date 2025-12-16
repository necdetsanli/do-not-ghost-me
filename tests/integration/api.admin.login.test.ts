// tests/integration/api.admin.login.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const {
  isAllowedAdminHostMock,
  verifyAdminPasswordMock,
  createAdminSessionTokenMock,
  withAdminSessionCookieMock,
  verifyCsrfTokenMock,
  logWarnMock,
  logErrorMock,
} = vi.hoisted(() => {
  return {
    isAllowedAdminHostMock: vi.fn(),
    verifyAdminPasswordMock: vi.fn(),
    createAdminSessionTokenMock: vi.fn(),
    withAdminSessionCookieMock: vi.fn(),
    verifyCsrfTokenMock: vi.fn(),
    logWarnMock: vi.fn(),
    logErrorMock: vi.fn(),
  };
});

vi.mock("@/lib/adminAuth", () => ({
  isAllowedAdminHost: isAllowedAdminHostMock,
  verifyAdminPassword: verifyAdminPasswordMock,
  createAdminSessionToken: createAdminSessionTokenMock,
  withAdminSessionCookie: withAdminSessionCookieMock,
}));

vi.mock("@/lib/csrf", () => ({
  verifyCsrfToken: verifyCsrfTokenMock,
}));

vi.mock("@/lib/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logWarn: logWarnMock,
  logError: logErrorMock,
}));

import { POST } from "@/app/api/admin/login/route";
import {
  isAllowedAdminHost,
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
} from "@/lib/adminAuth";
import { verifyCsrfToken } from "@/lib/csrf";

/**
 * Host used for building stable test URLs and for origin checks.
 * Falls back to localhost when ADMIN_ALLOWED_HOST is not configured in tests.
 */
const ADMIN_HOST: string = process.env.ADMIN_ALLOWED_HOST ?? "localhost:3000";

/**
 * Absolute URL used to construct NextRequest objects.
 */
const LOGIN_URL: string = `http://${ADMIN_HOST}/api/admin/login`;

/**
 * Field names expected by the route handler.
 */
const CSRF_FIELD_NAME = "_csrf";
const PASSWORD_FIELD_NAME = "password";

/**
 * A deterministic test IP that passes IPv4 validation.
 */
const TEST_IP: string = "203.0.113.10";

/**
 * Builds an application/x-www-form-urlencoded request body.
 *
 * @param form - Key/value pairs to encode.
 * @returns The encoded request body string.
 */
function buildFormBody(form: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(form)) {
    params.set(key, value);
  }
  return params.toString();
}

/**
 * Creates a fresh NextRequest object for each invocation.
 *
 * Important:
 * NextRequest bodies are single-consumption. Never reuse a request instance
 * across multiple POST calls in a loop.
 *
 * @param args - Request configuration.
 * @param args.host - Host header for the request.
 * @param args.origin - Origin header for CSRF/origin checks.
 * @param args.form - Form fields to include in the request body.
 * @param args.forwardedFor - Optional X-Forwarded-For header value.
 * @returns A NextRequest ready to be passed to the route handler.
 */
function makeRequestWithForm(args: {
  host?: string;
  origin?: string;
  form: Record<string, string>;
  forwardedFor?: string;
}): NextRequest {
  const host: string = args.host ?? ADMIN_HOST;
  const origin: string = args.origin ?? `http://${ADMIN_HOST}`;
  const form: Record<string, string> = args.form;

  const headers = new Headers();
  headers.set("host", host);
  headers.set("origin", origin);
  headers.set("content-type", "application/x-www-form-urlencoded");
  headers.set("accept", "application/json");

  if (typeof args.forwardedFor === "string" && args.forwardedFor.length > 0) {
    headers.set("x-forwarded-for", args.forwardedFor);
  }

  const body: string = buildFormBody(form);

  return new NextRequest(LOGIN_URL, {
    method: "POST",
    headers,
    body,
  });
}

/**
 * Reads and parses the Location header as a URL.
 *
 * @param response - A redirect response.
 * @returns Parsed URL instance.
 * @throws {Error} If the Location header is missing.
 */
function readRedirectUrl(response: NextResponse): URL {
  const location: string | null = response.headers.get("location");
  if (location === null) {
    throw new Error("Expected a redirect response with a Location header.");
  }
  return new URL(location);
}

/**
 * Clears the global in-memory login rate limit store used by the route.
 *
 * This prevents cross-test leakage because the route persists its store on globalThis.
 */
function resetGlobalLoginRateLimitStore(): void {
  const globalAny = globalThis as {
    __adminLoginRateLimitStore?: Map<string, unknown>;
  };

  const store = globalAny.__adminLoginRateLimitStore;

  if (store !== undefined) {
    store.clear();
  }
}

beforeEach(() => {
  resetGlobalLoginRateLimitStore();

  vi.mocked(isAllowedAdminHost).mockReset().mockReturnValue(true);

  vi.mocked(withAdminSessionCookie)
    .mockReset()
    .mockImplementation((res: NextResponse) => res);

  vi.mocked(createAdminSessionToken).mockReset().mockReturnValue("test-token");

  vi.mocked(verifyAdminPassword).mockReset().mockReturnValue(false);

  vi.mocked(verifyCsrfToken)
    .mockReset()
    .mockImplementation((_purpose: string, token: string | null) => {
      return typeof token === "string" && token.trim().length > 0;
    });

  logWarnMock.mockReset();
  logErrorMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/login", () => {
  it("returns 403 when admin host is not allowed", async () => {
    vi.mocked(isAllowedAdminHost).mockReturnValue(false);

    const request = makeRequestWithForm({
      host: "evil.example.com",
      origin: "http://evil.example.com",
      form: {
        [PASSWORD_FIELD_NAME]: "irrelevant",
        [CSRF_FIELD_NAME]: "test-csrf-token",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);

    const json = (await response.json()) as { error: string };
    expect(json).toEqual({
      error: "Admin access is not allowed from this host.",
    });

    expect(verifyCsrfToken).not.toHaveBeenCalled();
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("returns 403 when Origin header is present but invalid", async () => {
    const request = makeRequestWithForm({
      origin: "not-a-valid-url",
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "test-csrf-token",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);

    const json = (await response.json()) as { error: string };
    expect(json).toEqual({
      error: "Admin access is not allowed from this host.",
    });

    expect(verifyCsrfToken).not.toHaveBeenCalled();
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("returns 403 when Origin host does not match the request host", async () => {
    const request = makeRequestWithForm({
      host: ADMIN_HOST,
      origin: "http://evil.example.com",
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "test-csrf-token",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);

    const json = (await response.json()) as { error: string };
    expect(json).toEqual({
      error: "Admin access is not allowed from this host.",
    });

    expect(verifyCsrfToken).not.toHaveBeenCalled();
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when CSRF token is missing", async () => {
    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(307);

    const redirectedUrl = readRedirectUrl(response);
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);
    expect(verifyCsrfToken).toHaveBeenCalledWith("admin-login", null);

    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when CSRF token is whitespace-only", async () => {
    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "   ",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(307);

    const redirectedUrl = readRedirectUrl(response);
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);
    expect(verifyCsrfToken).toHaveBeenCalledWith("admin-login", null);

    expect(verifyAdminPassword).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when CSRF token is invalid", async () => {
    vi.mocked(verifyCsrfToken).mockReturnValue(false);

    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "bad-csrf",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(307);

    const redirectedUrl = readRedirectUrl(response);
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when password field is missing", async () => {
    const request = makeRequestWithForm({
      form: {
        [CSRF_FIELD_NAME]: "ok-csrf",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(307);

    const redirectedUrl = readRedirectUrl(response);
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when password is whitespace-only", async () => {
    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "   ",
        [CSRF_FIELD_NAME]: "ok-csrf",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(307);

    const redirectedUrl = readRedirectUrl(response);
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when password is invalid", async () => {
    vi.mocked(verifyAdminPassword).mockReturnValue(false);

    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "wrong-password",
        [CSRF_FIELD_NAME]: "ok-csrf",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(307);

    const redirectedUrl = readRedirectUrl(response);
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).toHaveBeenCalledWith("wrong-password");

    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("on successful login, creates a session token and passes it to withAdminSessionCookie", async () => {
    vi.mocked(verifyAdminPassword).mockReturnValue(true);
    vi.mocked(createAdminSessionToken).mockReturnValue("test-session-token");
    vi.mocked(withAdminSessionCookie).mockImplementation((res) => res);

    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "test-admin-password",
        [CSRF_FIELD_NAME]: "ok-csrf",
      },
    });

    const response = await POST(request);

    expect(verifyCsrfToken).toHaveBeenCalledTimes(1);

    expect(verifyAdminPassword).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).toHaveBeenCalledWith("test-admin-password");

    expect(createAdminSessionToken).toHaveBeenCalledTimes(1);
    expect(withAdminSessionCookie).toHaveBeenCalledTimes(1);

    const cookieCall = vi.mocked(withAdminSessionCookie).mock.calls[0];
    expect(cookieCall).toBeDefined();

    const [, tokenArg] = cookieCall as unknown as [NextResponse, string];
    expect(tokenArg).toBe("test-session-token");

    expect(response.status).toBe(307);

    const finalRedirectUrl = readRedirectUrl(response);
    expect(finalRedirectUrl.pathname).toBe("/admin");
    expect(finalRedirectUrl.search).toBe("");
  });

  it("returns 429 after too many failed attempts from the same IP (in-memory lockout)", async () => {
    vi.mocked(verifyCsrfToken).mockReturnValue(false);

    for (let i = 0; i < 5; i += 1) {
      const req = makeRequestWithForm({
        forwardedFor: TEST_IP,
        form: {
          [PASSWORD_FIELD_NAME]: "pw",
          [CSRF_FIELD_NAME]: "bad",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(307);
    }

    const lockedReq = makeRequestWithForm({
      forwardedFor: TEST_IP,
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "bad",
      },
    });

    const lockedResponse = await POST(lockedReq);

    expect(lockedResponse.status).toBe(429);

    const json = (await lockedResponse.json()) as { error: string };
    expect(json.error).toContain("Too many admin login attempts");

    expect(verifyCsrfToken).toHaveBeenCalledTimes(5);
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("clears rate limit state after successful login (so attempts do not accumulate)", async () => {
    vi.mocked(verifyCsrfToken).mockReturnValue(false);

    const bad1 = makeRequestWithForm({
      forwardedFor: TEST_IP,
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "bad",
      },
    });

    const bad2 = makeRequestWithForm({
      forwardedFor: TEST_IP,
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "bad",
      },
    });

    const res1 = await POST(bad1);
    const res2 = await POST(bad2);

    expect(res1.status).toBe(307);
    expect(res2.status).toBe(307);

    vi.mocked(verifyCsrfToken).mockReturnValue(true);
    vi.mocked(verifyAdminPassword).mockReturnValue(true);
    vi.mocked(createAdminSessionToken).mockReturnValue("token");

    const goodReq = makeRequestWithForm({
      forwardedFor: TEST_IP,
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "ok",
      },
    });

    const okRes = await POST(goodReq);
    expect(okRes.status).toBe(307);

    const globalAny = globalThis as {
      __adminLoginRateLimitStore?: Map<string, unknown>;
    };
    const store = globalAny.__adminLoginRateLimitStore;

    if (store !== undefined) {
      expect(store.has(TEST_IP)).toBe(false);
    }

    vi.mocked(verifyCsrfToken).mockReturnValue(false);

    const afterReset = makeRequestWithForm({
      forwardedFor: TEST_IP,
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "bad",
      },
    });

    const afterResetRes = await POST(afterReset);
    expect(afterResetRes.status).toBe(307);
  });

  it("returns 500 JSON when an unexpected error occurs", async () => {
    vi.mocked(verifyCsrfToken).mockReturnValue(true);
    vi.mocked(verifyAdminPassword).mockImplementation(() => {
      throw new Error("boom");
    });

    const request = makeRequestWithForm({
      forwardedFor: TEST_IP,
      form: {
        [PASSWORD_FIELD_NAME]: "pw",
        [CSRF_FIELD_NAME]: "ok",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);

    const json = (await response.json()) as { error: string };
    expect(json).toEqual({ error: "Internal server error" });

    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();

    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });
});
