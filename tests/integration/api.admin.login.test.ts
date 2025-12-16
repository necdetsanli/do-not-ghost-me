import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const { isAllowedAdminHostMock, isOriginAllowedMock } = vi.hoisted(() => ({
  isAllowedAdminHostMock: vi.fn(),
  isOriginAllowedMock: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({
  isAllowedAdminHost: isAllowedAdminHostMock,
  isOriginAllowed: isOriginAllowedMock,
  verifyAdminPassword: vi.fn(),
  createAdminSessionToken: vi.fn(),
  withAdminSessionCookie: vi.fn((res) => res),
}));

vi.mock("@/lib/csrf", () => ({
  verifyCsrfToken: vi.fn(),
}));

import { POST } from "@/app/api/admin/login/route";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  withAdminSessionCookie,
} from "@/lib/adminAuth";
import { verifyCsrfToken } from "@/lib/csrf";

const ADMIN_HOST = process.env.ADMIN_ALLOWED_HOST ?? "localhost:3000";
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
  vi.mocked(verifyCsrfToken).mockReset().mockReturnValue(true);
  vi.mocked(verifyAdminPassword).mockReset();
  vi.mocked(createAdminSessionToken).mockReset();
  vi.mocked(withAdminSessionCookie)
    .mockReset()
    .mockImplementation((res) => res);

  isAllowedAdminHostMock.mockReset().mockReturnValue(true);
  isOriginAllowedMock.mockReset().mockReturnValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/login", () => {
  it("returns 403 when admin host or origin is not allowed", async () => {
    isAllowedAdminHostMock.mockReturnValue(false);

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

    const response = await POST(request);

    expect(response.status).toBe(307);

    const location = response.headers.get("location");
    expect(location).not.toBeNull();

    const redirectedUrl = new URL(location ?? "");
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

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

    vi.mocked(verifyAdminPassword).mockReturnValue(false);

    const response = await POST(request);

    expect(response.status).toBe(307);

    const location = response.headers.get("location");
    expect(location).not.toBeNull();

    const redirectedUrl = new URL(location ?? "");
    expect(redirectedUrl.pathname).toBe("/admin/login");
    expect(redirectedUrl.search).toBe("?error=1");

    expect(verifyAdminPassword).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).toHaveBeenCalledWith("wrong-password");

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

    vi.mocked(verifyAdminPassword).mockReturnValue(true);
    vi.mocked(createAdminSessionToken).mockReturnValue("test-session-token");
    vi.mocked(withAdminSessionCookie).mockImplementation((res) => res);

    const response = await POST(request);

    expect(verifyAdminPassword).toHaveBeenCalledTimes(1);
    expect(verifyAdminPassword).toHaveBeenCalledWith("test-admin-password");

    expect(createAdminSessionToken).toHaveBeenCalledTimes(1);
    expect(withAdminSessionCookie).toHaveBeenCalledTimes(1);

    const cookieCall = vi.mocked(withAdminSessionCookie).mock.calls[0];
    expect(cookieCall).toBeDefined();

    const [, tokenArg] = cookieCall as unknown as [NextResponse, string];
    expect(tokenArg).toBe("test-session-token");

    expect(response.status).toBe(307);

    const finalLocation = response.headers.get("location");
    expect(finalLocation).not.toBeNull();

    const finalRedirectUrl = new URL(finalLocation ?? "");
    expect(finalRedirectUrl.pathname).toBe("/admin");
    expect(finalRedirectUrl.search).toBe("");
  });
});
