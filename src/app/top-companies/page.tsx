// src/app/top-companies/page.tsx
import type { JSX } from "react";
import type { CountryCode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  COUNTRY_OPTIONS,
  categorySlugToEnum,
  senioritySlugToEnum,
  stageSlugToEnum,
  categoryEnumToSlug,
  seniorityEnumToSlug,
  stageEnumToSlug,
} from "@/lib/enums";
import {
  TopCompaniesActiveFilters,
  TopCompaniesFilterForm,
  TopCompaniesPagination,
  TopCompaniesResultSummary,
  TopCompaniesTable,
} from "./TopCompaniesComponents";
import type { ResolvedFilters, SearchParams, TopCompanyRow } from "./types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const MAX_PAGE = 1000;

/**
 * Parse and sanitise raw search parameters from the URL.
 * This is the single place where we trust query-string input.
 */
function parseFilters(searchParams?: SearchParams): ResolvedFilters {
  const pageParam = searchParams?.page ?? "1";
  const rawPage = Number.parseInt(pageParam, 10);
  const safeRawPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const page = Math.min(safeRawPage, MAX_PAGE);

  const rawSearch = (searchParams?.search ?? "").trim();
  const search = rawSearch !== "" ? rawSearch.slice(0, 120) : undefined;

  const rawCountry = (searchParams?.country ?? "").trim().toUpperCase();
  let country: CountryCode | undefined;
  if (rawCountry !== "") {
    if ((COUNTRY_OPTIONS as readonly string[]).includes(rawCountry)) {
      country = rawCountry as CountryCode;
    }
  }

  const categorySlugRaw = (searchParams?.category ?? "").trim().toLowerCase();
  const categorySlug =
    categorySlugRaw === "" || categorySlugRaw === "all"
      ? undefined
      : categorySlugRaw;
  const positionCategory =
    categorySlug !== undefined ? categorySlugToEnum(categorySlug) : undefined;

  const senioritySlugRaw = (searchParams?.seniority ?? "").trim().toLowerCase();
  const senioritySlug =
    senioritySlugRaw === "" || senioritySlugRaw === "all"
      ? undefined
      : senioritySlugRaw;
  const seniority =
    senioritySlug !== undefined
      ? senioritySlugToEnum(senioritySlug)
      : undefined;

  const stageSlugRaw = (searchParams?.stage ?? "").trim().toLowerCase();
  const stageSlug =
    stageSlugRaw === "" || stageSlugRaw === "all" ? undefined : stageSlugRaw;
  const stage =
    stageSlug !== undefined ? stageSlugToEnum(stageSlug) : undefined;

  return {
    page,
    search,
    country,
    positionCategory,
    seniority,
    stage,
  };
}

/**
 * Fetch one page of "top companies" and basic pagination metadata.
 *
 * The query:
 * - applies filters on the Report table,
 * - groups by (companyId, country),
 * - orders by descending report count,
 * - looks up company names for the current page,
 * - computes total row count for pagination.
 */
async function getCompaniesPage(filters: ResolvedFilters): Promise<{
  items: TopCompanyRow[];
  totalPages: number;
  totalCompanies: number;
}> {
  const { page, search, country, positionCategory, seniority, stage } = filters;
  const safePage = page > 0 ? page : 1;
  const skip = (safePage - 1) * PAGE_SIZE;

  const where: Prisma.ReportWhereInput = {
    status: "ACTIVE",
  };

  if (search !== undefined && search !== "") {
    where.company = {
      name: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  if (country !== undefined) {
    where.country = country;
  }

  if (positionCategory !== undefined) {
    where.positionCategory = positionCategory;
  }

  if (seniority !== undefined) {
    where.jobLevel = seniority;
  }

  if (stage !== undefined) {
    where.stage = stage;
  }

  // 1) Page of grouped (companyId, country) pairs ordered by report count.
  const grouped = await prisma.report.groupBy({
    by: ["companyId", "country"],
    where,
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    skip,
    take: PAGE_SIZE,
  });

  const companyIds = grouped.map((g) => g.companyId);

  // 2) Load company names for this page.
  const companies = await prisma.company.findMany({
    where: {
      id: { in: companyIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const companyMap = new Map<string, string>(
    companies.map((c) => [c.id, c.name]),
  );

  const items: TopCompanyRow[] = grouped.map((g) => {
    type CountAll = { _all: number };

    const countAll =
      typeof g._count === "object" && g._count !== null
        ? (g._count as CountAll)._all
        : 0;

    return {
      id: g.companyId,
      name: companyMap.get(g.companyId) ?? "Unknown company",
      country: g.country,
      reportsCount: countAll,
    };
  });

  // 3) Total count for pagination (number of distinct companyId+country pairs).
  const allGroups = await prisma.report.groupBy({
    by: ["companyId", "country"],
    where,
    _count: {
      _all: true,
    },
  });

  const totalCompanies = allGroups.length;
  const totalPages =
    totalCompanies === 0
      ? 1
      : Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));

  return { items, totalPages, totalCompanies };
}

/**
 * Build a URL for a given page, preserving existing filter query parameters.
 */
function buildPageUrl(
  base: string,
  page: number,
  filters: ResolvedFilters,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (filters.search !== undefined && filters.search !== "") {
    params.set("search", filters.search);
  }
  if (filters.country !== undefined) {
    params.set("country", filters.country);
  }
  if (filters.positionCategory !== undefined) {
    params.set("category", categoryEnumToSlug(filters.positionCategory));
  }
  if (filters.seniority !== undefined) {
    params.set("seniority", seniorityEnumToSlug(filters.seniority));
  }
  if (filters.stage !== undefined) {
    params.set("stage", stageEnumToSlug(filters.stage));
  }

  const qs = params.toString();
  return qs !== "" ? `${base}?${qs}` : base;
}

type PageProps = {
  /**
   * In Next.js 16, searchParams is a Promise and must be awaited
   * inside server components.
   */
  searchParams: Promise<SearchParams>;
};

/**
 * Server component entry point for the /top-companies route.
 * Orchestrates parsing filters, fetching data and rendering presentational
 * components.
 */
export default async function TopCompaniesPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);

  const { page, search } = filters;
  const { items, totalPages, totalCompanies } = await getCompaniesPage(filters);
  const hasResults = items.length > 0;

  const previousHref =
    hasResults && page > 1
      ? buildPageUrl("/top-companies", Math.max(1, page - 1), filters)
      : undefined;

  const nextHref =
    hasResults && page < totalPages
      ? buildPageUrl("/top-companies", Math.min(totalPages, page + 1), filters)
      : undefined;

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: "960px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.8rem",
          fontWeight: 700,
          marginBottom: "1rem",
        }}
      >
        Ghosted companies (community reports)
      </h1>

      <p style={{ marginBottom: "0.75rem", color: "#4b5563" }}>
        This page shows aggregated reports about companies that have ghosted
        candidates. No personal data is stored; only minimal, anonymous
        statistics are displayed.
      </p>

      <p
        style={{
          marginBottom: "1.25rem",
          fontSize: "0.9rem",
          color: "#6b7280",
        }}
      >
        Use the filters below to slice the data by country, position category,
        seniority and interview stage.
      </p>

      <TopCompaniesFilterForm filters={filters} />

      <TopCompaniesActiveFilters filters={filters} />

      <TopCompaniesResultSummary
        hasResults={hasResults}
        page={page}
        totalPages={totalPages}
        totalCompanies={totalCompanies}
        search={search}
      />

      {hasResults && (
        <TopCompaniesTable items={items} page={page} pageSize={PAGE_SIZE} />
      )}

      <TopCompaniesPagination
        hasResults={hasResults}
        page={page}
        totalPages={totalPages}
        previousHref={previousHref}
        nextHref={nextHref}
      />
    </main>
  );
}
