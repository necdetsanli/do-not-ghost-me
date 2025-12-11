// src/app/top-companies/_components/TopCompaniesPagination.tsx
import type { JSX } from "react";
import type { CompaniesPaginationProps } from "../types";

/**
 * Simple "Previous / Next" pagination controls.
 * Links are precomputed in the page component.
 */
export function CompaniesPagination(
  props: CompaniesPaginationProps,
): JSX.Element {
  const { hasResults, page, totalPages, previousHref, nextHref } = props;

  if (!hasResults) {
    return <nav />;
  }

  const prevDisabled = page <= 1 || previousHref == null;
  const nextDisabled = page >= totalPages || nextHref == null;

  return (
    <nav
      className="mt-2 flex items-center gap-3 text-sm text-secondary"
      aria-label="Pagination"
    >
      <a
        href={previousHref ?? "#"}
        aria-disabled={prevDisabled}
        className={`underline ${
          prevDisabled ? "pointer-events-none opacity-40" : "hover:text-primary"
        }`}
      >
        Previous
      </a>

      <span>
        Page {page} / {totalPages}
      </span>

      <a
        href={nextHref ?? "#"}
        aria-disabled={nextDisabled}
        className={`underline ${
          nextDisabled ? "pointer-events-none opacity-40" : "hover:text-primary"
        }`}
      >
        Next
      </a>
    </nav>
  );
}
