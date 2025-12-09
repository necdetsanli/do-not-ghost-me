// src/app/admin/_components/AdminEmptyState.tsx
import type { JSX } from "react";

/**
 * Empty-state notice when there are no reports yet.
 */
export function AdminEmptyState(): JSX.Element {
  return (
    <div className="rounded-lg border border-primary bg-muted px-4 py-3 text-sm text-secondary">
      No reports have been submitted yet.
    </div>
  );
}
