import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Hoisted mock for `adminSessionCookieOptions`, used by the logout route.
 */
const { adminSessionCookieOptionsMock } = vi.hoisted(() => ({
  adminSessionCookieOptionsMock: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({
  adminSessionCookieOptions: adminSessionCookieOptionsMock,
}));

import { POST } from "@/app/api/admin/logout/route";

describe("POST /api/admin/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the admin session cookie and redirects to /admin/login", () => {
    const cookieOptions = {
      name: "admin_session",
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    };

    adminSessionCookieOptionsMock.mockReturnValue(cookieOptions);

    const res = POST();

    expect(adminSessionCookieOptionsMock).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");

    const setCookie = res.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain(`${cookieOptions.name}=`);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
    expect(setCookie).toContain("Path=/");
  });
});
