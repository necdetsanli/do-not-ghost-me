// tests/integration/api.admin.logout.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Hoisted mock for `adminSessionCookieOptions`, used by the logout route.
 */
const { adminSessionCookieOptionsMock } = vi.hoisted(() => ({
  adminSessionCookieOptionsMock: vi.fn(),
}));

// Bu test dosyasında ADMIN_ALLOWED_HOST'i "unset" yapıyoruz ki
// logout endpoint'i host restriction yüzünden 403 dönmesin.
vi.mock("@/env", () => ({
  env: {
    ADMIN_ALLOWED_HOST: undefined,
  },
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

    const req = new NextRequest("http://localhost:3000/api/admin/logout", {
      method: "POST",
    });

    const res = POST(req);

    // Host kısıtı mock ile kapalı -> 302 redirect + cookie clear bekliyoruz.
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");

    const setCookie = res.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain(`${cookieOptions.name}=`);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
    expect(setCookie).toContain("Path=/");
  });
});
