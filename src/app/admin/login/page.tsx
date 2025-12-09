// src/app/admin/login/page.tsx
import type { JSX } from "react";
import { createCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const CSRF_FIELD_NAME = "_csrf";

/**
 * Admin login page.
 *
 * Pure server component:
 * - Generates a CSRF token for the login form.
 * - Renders a minimal, centered login card.
 * - Does not use client components (no "use client") to keep it simple and secure.
 */
export default function AdminLoginPage(): JSX.Element {
  const csrfToken = createCsrfToken("admin-login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-primary bg-surface px-6 py-6 shadow-md md:px-8 md:py-8">
        <header className="mb-4 space-y-2">
          <h1 className="text-2xl font-semibold text-primary">Admin login</h1>
          <p className="text-sm text-secondary">
            This area is restricted to administrators. Your login will be
            secured using a signed, HttpOnly session cookie.
          </p>
        </header>

        <form
          method="POST"
          action="/api/admin/login"
          className="mt-4 space-y-4"
          aria-label="Admin login form"
        >
          <input type="hidden" name={CSRF_FIELD_NAME} value={csrfToken} />

          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="flex flex-col gap-1 text-sm text-primary"
            >
              <span>Password</span>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-primary bg-base px-3 py-2 text-sm text-primary placeholder:text-tertiary focus-visible:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md border border-primary bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-tertiary">
          Multiple failed attempts may be logged for security monitoring.
        </p>
      </section>
    </div>
  );
}
