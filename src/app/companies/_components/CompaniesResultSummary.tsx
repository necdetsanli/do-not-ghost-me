// src/app/top-companies/_components/TopCompaniesResultSummary.tsx
import type { JSX } from "react";
import type { CompaniesResultSummaryProps } from "../types";

/**
 * Short text summary / empty-state section above the results table.
 */
export function CompaniesResultSummary(
  props: CompaniesResultSummaryProps,
): JSX.Element {
  const { hasResults, page, totalPages, totalCompanies, search } = props;

  return (
    <section className="mb-4">
      {hasResults ? (
        <p className="text-sm text-secondary">
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>{" "}
          ({totalCompanies} company–country entries with at least one report).
        </p>
      ) : (
        <div className="alert-error rounded-lg border px-4 py-3 text-sm">
          {search !== undefined && search !== "" ? (
            <p>
              No companies found matching <strong>&quot;{search}&quot;</strong>{" "}
              with the selected filters. Try adjusting your search or removing
              some filters.
            </p>
          ) : (
            <p>
              No companies found for the selected filters. Try adjusting the
              search or filters and try again.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
