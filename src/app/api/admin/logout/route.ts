// src/app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { adminSessionCookieOptions } from "@/lib/adminAuth";

/**
 * Log out the current admin by clearing the session cookie and
 * redirecting back to the login page.
 *
 * This handler is synchronous because it performs no asynchronous work.
 */
export function POST(): NextResponse {
  const cookieOpts = adminSessionCookieOptions();

  const response = new NextResponse(null, {
    status: 302,
    headers: {
      Location: "/admin/login",
    },
  });

  response.cookies.set({
    name: cookieOpts.name,
    value: "",
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    maxAge: 0,
  });

  return response;
}
