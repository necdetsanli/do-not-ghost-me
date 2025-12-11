// src/app/companies/page.tsx
import type { JSX } from "react";
import type { Metadata } from "next";

import { CompaniesActiveFilters } from "./_components/CompaniesActiveFilters";
import { CompaniesFilterForm } from "./_components/CompaniesFilterForm";
import { CompaniesPagination } from "./_components/CompaniesPagination";
import { CompaniesResultSummary } from "./_components/CompaniesResultSummary";
import { CompaniesTable } from "./_components/CompaniesTable";
import type { SearchParams } from "./types";
import { parseFilters } from "./_lib/filters";
import { getCompaniesPage } from "./_lib/data";
import { buildPageUrl } from "./_lib/url";
import { PAGE_SIZE } from "./_lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Companies | Do Not Ghost Me",
  description:
    "Companies ranked by the number of ghosting reports submitted by job seekers. Filter by country, role category, seniority and interview stage.",
};

const COMPANIES_PATH = "/companies";

type PageProps = {
  /**
   * In Next.js 16, searchParams is a Promise and must be awaited
   * inside server components.
   */
  searchParams: Promise<SearchParams>;
};

/**
 * Server component entry point for the /companies route.
 *
 * Responsibilities:
 * - Parse and normalise filter query parameters.
 * - Fetch the current page of aggregated company data.
 * - Compute pagination URLs based on the resolved filters.
 * - Compose presentational components for filters, table and pagination.
 */
export default async function CompaniesPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);

  const { page, search } = filters;

  const { items, totalPages, totalCompanies } = await getCompaniesPage(filters);
  const hasResults = items.length > 0;

  const previousHref =
    hasResults === true && page > 1
      ? buildPageUrl(COMPANIES_PATH, Math.max(1, page - 1), filters)
      : undefined;

  const nextHref =
    hasResults === true && page < totalPages
      ? buildPageUrl(COMPANIES_PATH, Math.min(totalPages, page + 1), filters)
      : undefined;

  return (
    <div className="min-h-screen bg-base">
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <header className="mb-6 space-y-3">
          <h1 className="text-3xl font-semibold text-primary md:text-4xl">
            View companies by ghosting reports
          </h1>
          <p className="max-w-2xl text-base text-secondary md:text-lg">
            Companies ranked by the number of ghosting reports submitted by job
            seekers. Data is aggregated and anonymized.
          </p>
          <p className="max-w-2xl text-sm text-tertiary">
            Use the filters below to slice the data by country, position
            category, seniority and interview stage. Only reports from active,
            non-deleted entries are included.
          </p>
        </header>

        <CompaniesFilterForm filters={filters} />

        <CompaniesActiveFilters filters={filters} />

        <CompaniesResultSummary
          hasResults={hasResults}
          page={page}
          totalPages={totalPages}
          totalCompanies={totalCompanies}
          search={search}
        />

        {hasResults === true ? (
          <CompaniesTable items={items} page={page} pageSize={PAGE_SIZE} />
        ) : null}

        <CompaniesPagination
          hasResults={hasResults}
          page={page}
          totalPages={totalPages}
          previousHref={previousHref}
          nextHref={nextHref}
        />
      </section>
    </div>
  );
}
