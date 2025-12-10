// src/app/admin/page.tsx
import type { JSX } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/env";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";
import { fetchAdminReports } from "@/app/admin/_lib/adminData";
import { AdminHeader } from "@/app/admin/_components/AdminHeader";
import { AdminEmptyState } from "@/app/admin/_components/AdminEmptyState";
import { AdminReportsTable } from "@/app/admin/_components/AdminReportsTable";

export const dynamic = "force-dynamic";

/**
 * Server-side admin dashboard page.
 *
 * Responsibilities:
 * - Enforce host restriction (ADMIN_ALLOWED_HOST).
 * - Verify the signed admin session cookie.
 * - Fetch the latest reports.
 * - Delegate rendering to presentational components.
 */
export default async function AdminPage(): Promise<JSX.Element> {
  // ---------------------------------------------------------------------------
  // 1) Host restriction: avoid accidental exposure on other hosts
  // ---------------------------------------------------------------------------
  const headersList = await headers();
  const hostHeader = headersList.get("host");
  const allowedHostFromEnv = env.ADMIN_ALLOWED_HOST;

  if (allowedHostFromEnv !== undefined && allowedHostFromEnv !== null) {
    const trimmedAllowed = allowedHostFromEnv.trim();

    // Empty or whitespace-only => do not enforce host restriction
    if (trimmedAllowed.length > 0) {
      // If Host header yoksa veya izin verilenle eşleşmiyorsa, public home'a at
      if (hostHeader === null || hostHeader !== trimmedAllowed) {
        redirect("/");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2) Admin session check via signed cookie
  // ---------------------------------------------------------------------------
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);
  const token = tokenCookie?.value ?? null;

  if (token === null || token === "") {
    redirect("/admin/login");
  }

  const session = verifyAdminSessionToken(token);

  if (session === null) {
    redirect("/admin/login");
  }

  // ---------------------------------------------------------------------------
  // 3) Load latest reports for moderation
  // ---------------------------------------------------------------------------
  const reports = await fetchAdminReports();
  const hasReports = reports.length > 0;

  // ---------------------------------------------------------------------------
  // 4) Render dashboard (layout only)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-base">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <AdminHeader />

        {hasReports === false ? (
          <AdminEmptyState />
        ) : (
          <section aria-label="Latest reports for moderation" className="mt-4">
            <AdminReportsTable reports={reports} />
          </section>
        )}
      </section>
    </div>
  );
}
