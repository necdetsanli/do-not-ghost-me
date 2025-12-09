// src/app/admin/_components/AdminHeader.tsx
import type { JSX } from "react";

/**
 * Header for the admin reports dashboard, including the logout button.
 */
export function AdminHeader(): JSX.Element {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold text-primary">
          Admin – Reports
        </h1>
        <p className="max-w-2xl text-sm text-secondary">
          Latest community reports (including flagged/deleted entries). Use the
          actions on the right to moderate. Public statistics only include
          active, non-deleted reports.
        </p>
      </div>

      <form method="POST" action="/api/admin/logout">
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-primary bg-surface px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-surface-hover"
        >
          Log out
        </button>
      </form>
    </header>
  );
}
