// src/app/admin/logout/page.tsx
"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin logout page.
 *
 * When a user visits /admin/logout:
 * - performs a POST request to /api/admin/logout to clear the admin session
 *   cookie on the server, and
 * - redirects the user back to the public home page ("/").
 *
 * This keeps the logout mechanics on the API side (where cookies are
 * managed) while providing a simple UX-friendly page.
 */
export default function AdminLogoutPage(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "include",
        });
      } finally {
        // Always navigate away from /admin/logout, even if the request fails.
        router.replace("/");
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-8">
      <section className="w-full max-w-lg rounded-xl border border-primary bg-surface px-6 py-6 shadow-md md:px-8 md:py-8">
        <h1 className="mb-2 text-xl font-semibold text-primary md:text-2xl">Logging you out…</h1>
        <p className="text-sm text-secondary md:text-base">
          You are being signed out of the admin dashboard and will be redirected to the public
          homepage.
        </p>
      </section>
    </div>
  );
}
