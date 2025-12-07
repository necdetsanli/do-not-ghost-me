import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Hoisted mocks for the admin auth helpers used in the login route.
 */
const {
  isAllowedAdminHostMock,
  verifyAdminPasswordMock,
  createAdminSessionTokenMock,
  withAdminSessionCookieMock,
} = vi.hoisted(() => ({
  isAllowedAdminHostMock: vi.fn(),
  verifyAdminPasswordMock: vi.fn(),
  createAdminSessionTokenMock: vi.fn(),
  // Varsayılan: sadece response'u aynen geri döndür.
  withAdminSessionCookieMock: vi.fn((res: NextResponse) => res),
}));

vi.mock("@/lib/adminAuth", () => ({
  isAllowedAdminHost: isAllowedAdminHostMock,
  verifyAdminPassword: verifyAdminPasswordMock,
  createAdminSessionToken: createAdminSessionTokenMock,
  withAdminSessionCookie: withAdminSessionCookieMock,
}));

import { POST } from "@/app/api/admin/login/route";

/**
 * Build a minimal NextRequest-like object that only supports:
 * - url
 * - formData()
 */
function createFormRequest(
  password: string | null,
  url = "https://example.test/admin/login",
): NextRequest {
  const fakeFormData = {
    get(name: string): FormDataEntryValue | null {
      if (name === "password") {
        return password;
      }
      return null;
    },
  } as unknown as FormData;

  return {
    url,
    formData: async () => fakeFormData,
  } as unknown as NextRequest;
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when admin host is not allowed", async () => {
    isAllowedAdminHostMock.mockReturnValue(false);

    const req = createFormRequest("any-password");
    const res = await POST(req);

    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/not allowed from this host/i);

    expect(verifyAdminPasswordMock).not.toHaveBeenCalled();
    expect(withAdminSessionCookieMock).not.toHaveBeenCalled();
  });

  it("returns 400 when password field is missing", async () => {
    isAllowedAdminHostMock.mockReturnValue(true);

    // password=null -> formData().get("password") returns null
    const req = createFormRequest(null);
    const res = await POST(req);

    expect(res.status).toBe(400);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Missing password");

    expect(verifyAdminPasswordMock).not.toHaveBeenCalled();
  });

  it("redirects back to /admin/login?error=1 when password is invalid", async () => {
    isAllowedAdminHostMock.mockReturnValue(true);
    verifyAdminPasswordMock.mockReturnValue(false);

    const req = createFormRequest("wrong-password");
    const res = await POST(req);

    expect(res.status).toBe(303);

    const location = res.headers.get("location");
    expect(location).not.toBeNull();

    const url = new URL(location as string);
    expect(url.pathname).toBe("/admin/login");
    expect(url.searchParams.get("error")).toBe("1");

    expect(verifyAdminPasswordMock).toHaveBeenCalledTimes(1);
    expect(withAdminSessionCookieMock).not.toHaveBeenCalled();
  });

  it("on successful login, creates a session token and passes it to withAdminSessionCookie", async () => {
    isAllowedAdminHostMock.mockReturnValue(true);
    verifyAdminPasswordMock.mockReturnValue(true);
    createAdminSessionTokenMock.mockReturnValue("test-session-token");

    // Implementasyonu sade tut: argümanları testten okuyacağız.
    withAdminSessionCookieMock.mockImplementation((res: NextResponse) => res);

    const req = createFormRequest("correct-password");
    const res = await POST(req);

    // Should be a redirect to /admin
    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe("/admin");

    // Verify helper calls
    expect(verifyAdminPasswordMock).toHaveBeenCalledTimes(1);
    expect(createAdminSessionTokenMock).toHaveBeenCalledTimes(1);
    expect(withAdminSessionCookieMock).toHaveBeenCalledTimes(1);

    const firstCall = withAdminSessionCookieMock.mock.calls[0] as unknown[];
    const tokenArg = firstCall[1] as unknown;

    expect(typeof tokenArg).toBe("string");
    expect(tokenArg).toBe("test-session-token");
  });
});
