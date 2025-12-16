import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  isAllowedAdminHostMock,
  isOriginAllowedMock,
  adminSessionCookieOptionsMock,
} = vi.hoisted(() => ({
  isAllowedAdminHostMock: vi.fn(),
  isOriginAllowedMock: vi.fn(),
  adminSessionCookieOptionsMock: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({
  isAllowedAdminHost: isAllowedAdminHostMock,
  isOriginAllowed: isOriginAllowedMock,
  adminSessionCookieOptions: adminSessionCookieOptionsMock,
}));

import { POST } from "@/app/api/admin/logout/route";

describe("POST /api/admin/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedAdminHostMock.mockReturnValue(true);
    isOriginAllowedMock.mockReturnValue(true);
  });

  it("clears the admin session cookie", async () => {
    const cookieOptions = {
      name: "dg_admin",
      httpOnly: true,
      secure: true,
      sameSite: "strict" as const,
      path: "/",
      maxAge: 1800,
    };

    adminSessionCookieOptionsMock.mockReturnValue(cookieOptions);

    const headers = new Headers();
    headers.set("host", "localhost:3000");
    headers.set("origin", "http://localhost:3000");

    const req = new NextRequest("http://localhost:3000/api/admin/logout", {
      method: "POST",
      headers,
    });

    const res = await POST(req);

    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${cookieOptions.name}=`);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
    expect(setCookie).toContain("Path=/");
  });
});
