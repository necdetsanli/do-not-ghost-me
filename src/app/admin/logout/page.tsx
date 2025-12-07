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
    <main
      style={{
        padding: "2rem",
        maxWidth: "640px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
        }}
      >
        Logging you out…
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#4b5563" }}>
        You are being signed out of the admin dashboard and will be redirected
        to the public homepage.
      </p>
    </main>
  );
}
