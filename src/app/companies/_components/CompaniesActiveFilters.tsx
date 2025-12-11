// src/app/top-companies/_components/TopCompaniesActiveFilters.tsx
import type { JSX } from "react";
import {
  labelForCategory,
  labelForJobLevel,
  labelForStage,
  labelForCountry,
} from "@/lib/enums";
import type { CompaniesActiveFiltersProps } from "../types";

/**
 * Chip-style summary of currently active filters.
 */
export function CompaniesActiveFilters(
  props: CompaniesActiveFiltersProps,
): JSX.Element {
  const { filters } = props;
  const { search, country, positionCategory, seniority, stage } = filters;

  const hasActiveFilters =
    (search !== undefined && search !== "") ||
    country !== undefined ||
    positionCategory !== undefined ||
    seniority !== undefined ||
    stage !== undefined;

  if (!hasActiveFilters) {
    return <section className="mb-3" />;
  }

  return (
    <section className="mb-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary bg-muted px-3 py-2 text-xs text-secondary">
        <span className="mr-1 font-medium text-primary">Active filters:</span>

        {search !== undefined && search !== "" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-surface px-2 py-0.5 text-xs text-secondary">
            <span>Search:</span>
            <strong className="text-primary">&quot;{search}&quot;</strong>
          </span>
        )}

        {country !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-surface px-2 py-0.5 text-xs text-secondary">
            <span>Country:</span>
            <strong className="text-primary">{labelForCountry(country)}</strong>
          </span>
        )}

        {positionCategory !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-surface px-2 py-0.5 text-xs text-secondary">
            <span>Category:</span>
            <strong className="text-primary">
              {labelForCategory(positionCategory)}
            </strong>
          </span>
        )}

        {seniority !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-surface px-2 py-0.5 text-xs text-secondary">
            <span>Seniority:</span>
            <strong className="text-primary">
              {labelForJobLevel(seniority)}
            </strong>
          </span>
        )}

        {stage !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-surface px-2 py-0.5 text-xs text-secondary">
            <span>Stage:</span>
            <strong className="text-primary">{labelForStage(stage)}</strong>
          </span>
        )}
      </div>
    </section>
  );
}
