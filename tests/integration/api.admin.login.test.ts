// tests/integration/api.admin.login.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { POST } from "@/app/api/admin/login/route";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
} from "@/lib/adminAuth";
import { verifyCsrfToken } from "@/lib/csrf";

// Mock env so ADMIN_ALLOWED_HOST is stable in tests.
vi.mock("@/env", () => ({
  env: {
    ADMIN_ALLOWED_HOST: "127.0.0.1:3000",
  },
}));

// Mock admin auth helpers.
vi.mock("@/lib/adminAuth", () => ({
  verifyAdminPassword: vi.fn(),
  createAdminSessionToken: vi.fn(),
  withAdminSessionCookie: vi.fn((res) => res),
}));

// Mock CSRF verification. We test the login flow, not HMAC details.
vi.mock("@/lib/csrf", () => ({
  verifyCsrfToken: vi.fn(),
}));

const ADMIN_HOST = "127.0.0.1:3000";
const LOGIN_URL = `http://${ADMIN_HOST}/api/admin/login`;
const CSRF_FIELD_NAME = "_csrf";
const PASSWORD_FIELD_NAME = "password";

function buildFormBody(form: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(form)) {
    params.set(key, value);
  }
  return params.toString();
}

function makeRequestWithForm({
  host = ADMIN_HOST,
  origin = `http://${ADMIN_HOST}`,
  form,
}: {
  host?: string;
  origin?: string;
  form: Record<string, string>;
}): NextRequest {
  const headers = new Headers();
  headers.set("host", host);
  headers.set("origin", origin);
  headers.set("content-type", "application/x-www-form-urlencoded");

  const body = buildFormBody(form);

  return new NextRequest(LOGIN_URL, {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  // Reset all mocks to a known state before each test.
  vi.mocked(verifyCsrfToken).mockReset().mockReturnValue(true);
  vi.mocked(verifyAdminPassword).mockReset();
  vi.mocked(createAdminSessionToken).mockReset();
  vi.mocked(withAdminSessionCookie)
    .mockReset()
    .mockImplementation((res) => res);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/login", () => {
  it("returns 403 when admin host is not allowed", async () => {
    const headers = new Headers();
    headers.set("host", "evil.example.com");
    headers.set("origin", "http://evil.example.com");
    headers.set("content-type", "application/x-www-form-urlencoded");

    const body = buildFormBody({
      [PASSWORD_FIELD_NAME]: "irrelevant",
      [CSRF_FIELD_NAME]: "test-csrf-token",
    });

    const request = new NextRequest(LOGIN_URL, {
      method: "POST",
      headers,
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(403);

    const json = (await response.json()) as { error: string };
    expect(json).toEqual({
      error: "Admin access is not allowed from this host.",
    });

    // When host is forbidden, we should not even attempt authentication.
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when password field is missing", async () => {
    const request = makeRequestWithForm({
      form: {
        [CSRF_FIELD_NAME]: "test-csrf-token",
      },
    });

    // CSRF is considered valid in this test.
    vi.mocked(verifyCsrfToken).mockReturnValue(true);

    const response = await POST(request);

    // NextResponse.redirect uses 307 for temporary redirects.
    expect(response.status).toBe(307);

    const location = response.headers.get("location");
    expect(location).not.toBeNull();

    const redirectedUrl = new URL(location ?? "");
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    // No password → we should not hit auth or session creation.
    expect(verifyAdminPassword).not.toHaveBeenCalled();
    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when password is invalid", async () => {
    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "wrong-password",
        [CSRF_FIELD_NAME]: "test-csrf-token",
      },
    });

    const verifyMock = vi.mocked(verifyAdminPassword);
    verifyMock.mockResolvedValue(false);
    vi.mocked(verifyCsrfToken).mockReturnValue(true);

    const response = await POST(request);

    expect(response.status).toBe(307);

    const location = response.headers.get("location");
    expect(location).not.toBeNull();

    const redirectedUrl = new URL(location ?? "");
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(verifyMock).toHaveBeenCalledWith("wrong-password");

    expect(createAdminSessionToken).not.toHaveBeenCalled();
    expect(withAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("on successful login, verifies password, creates a session token and passes it to withAdminSessionCookie", async () => {
    const request = makeRequestWithForm({
      form: {
        [PASSWORD_FIELD_NAME]: "test-admin-password",
        [CSRF_FIELD_NAME]: "test-csrf-token",
      },
    });

    const verifyMock = vi.mocked(verifyAdminPassword);
    const createTokenMock = vi.mocked(createAdminSessionToken);
    const withCookieMock = vi.mocked(withAdminSessionCookie);

    vi.mocked(verifyCsrfToken).mockReturnValue(true);
    verifyMock.mockResolvedValue(true);
    createTokenMock.mockResolvedValue("test-session-token");

    // By default our mock returns the base response, but we also inspect args.
    withCookieMock.mockImplementation((res) => res);

    const response = await POST(request);

    // Password verification
    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(verifyMock).toHaveBeenCalledWith("test-admin-password");

    // Session token creation
    expect(createTokenMock).toHaveBeenCalledTimes(1);
    expect(createTokenMock).toHaveBeenCalledWith();

    // Cookie attachment
    expect(withCookieMock).toHaveBeenCalledTimes(1);

    const firstCall = withCookieMock.mock.calls[0] as unknown as [
      NextResponse<unknown>,
      string,
    ];
    const [cookieResponseArg, tokenArg] = firstCall;

    expect(tokenArg).toBe("test-session-token");

    const cookieLocation = cookieResponseArg.headers.get("location");
    expect(cookieLocation).not.toBeNull();

    const cookieRedirectUrl = new URL(cookieLocation ?? "");
    expect(cookieRedirectUrl.pathname).toBe("/admin");
    expect(cookieRedirectUrl.search).toBe("");

    // Final response returned from POST should be the redirected response.
    expect(response.status).toBe(307);

    const finalLocation = response.headers.get("location");
    expect(finalLocation).not.toBeNull();

    const finalRedirectUrl = new URL(finalLocation ?? "");
    expect(finalRedirectUrl.pathname).toBe("/admin");
    expect(finalRedirectUrl.search).toBe("");
  });
});
