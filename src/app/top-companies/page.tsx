// src/app/top-companies/page.tsx
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { PositionCategory, JobLevel, Stage } from "@prisma/client";

import {
  POSITION_CATEGORY_OPTIONS,
  JOB_LEVEL_OPTIONS,
  STAGE_OPTIONS,
  labelForCategory,
  labelForJobLevel,
  labelForStage,
  categoryEnumToSlug,
  categorySlugToEnum,
  seniorityEnumToSlug,
  senioritySlugToEnum,
  stageEnumToSlug,
  stageSlugToEnum,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type TopCompanyRow = {
  id: string;
  name: string;
  country: string | null;
  reportsCount: number;
};

type SearchParams = {
  page?: string;
  search?: string;
  country?: string;
  category?: string;
  seniority?: string;
  stage?: string;
};

type ResolvedFilters = {
  page: number;
  search?: string;
  country?: string;
  positionCategory?: PositionCategory;
  seniority?: JobLevel;
  stage?: Stage;
};

function parseFilters(searchParams?: SearchParams): ResolvedFilters {
  const pageParam = searchParams?.page ?? "1";
  const rawPage = parseInt(pageParam, 10);
  const safeRawPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const page = Math.min(safeRawPage, 1000); // For example, cap at page 1000

  const rawSearch = (searchParams?.search ?? "").trim();
  const search = rawSearch ? rawSearch.slice(0, 120) : undefined;

  const rawCountry = (searchParams?.country ?? "").trim();
  const country = rawCountry ? rawCountry.slice(0, 80) : undefined;

  const categorySlugRaw = (searchParams?.category ?? "").trim().toLowerCase();
  const categorySlug = categorySlugRaw || undefined;

  const senioritySlugRaw = (searchParams?.seniority ?? "").trim().toLowerCase();
  const senioritySlug = senioritySlugRaw || undefined;

  const stageSlugRaw = (searchParams?.stage ?? "").trim().toLowerCase();
  const stageSlug = stageSlugRaw || undefined;

  let positionCategory: PositionCategory | undefined;
  if (categorySlug && categorySlug !== "all") {
    positionCategory = categorySlugToEnum(categorySlug);
  }

  let seniority: JobLevel | undefined;
  if (senioritySlug && senioritySlug !== "all") {
    seniority = senioritySlugToEnum(senioritySlug);
  }

  let stage: Stage | undefined;
  if (stageSlug && stageSlug !== "all") {
    stage = stageSlugToEnum(stageSlug);
  }

  return {
    page,
    search,
    country,
    positionCategory,
    seniority,
    stage,
  };
}

async function getCompaniesPage(filters: ResolvedFilters): Promise<{
  items: TopCompanyRow[];
  totalPages: number;
  totalCompanies: number;
}> {
  const { page, search, country, positionCategory, seniority, stage } = filters;
  const safePage = page > 0 ? page : 1;
  const skip = (safePage - 1) * PAGE_SIZE;

  const where: Prisma.ReportWhereInput = {};

  if (search) {
    // Filter by company name (case-insensitive substring)
    where.company = {
      name: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  if (country) {
    // Filter by report country (case-insensitive exact match)
    where.country = {
      equals: country,
      mode: "insensitive",
    };
  }

  if (positionCategory) {
    // Filter by position category
    where.positionCategory = positionCategory;
  }

  if (seniority) {
    // Filter by job level (seniority)
    where.jobLevel = seniority;
  }

  if (stage) {
    where.stage = stage;
  }

  // 1) Group reports by companyId with filters applied
  const grouped = await prisma.report.groupBy({
    by: ["companyId"],
    where,
    _count: {
      _all: true,
      id: true,
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

  // 2) Load company metadata for the current page
  const companies = await prisma.company.findMany({
    where: {
      id: { in: companyIds },
    },
    select: {
      id: true,
      name: true,
      country: true,
    },
  });

  const companyMap = new Map(
    companies.map((c) => [c.id, { name: c.name, country: c.country }]),
  );

  const items: TopCompanyRow[] = grouped.map((g) => {
    const meta = companyMap.get(g.companyId);
    return {
      id: g.companyId,
      name: meta?.name ?? "Unknown company",
      country: meta?.country ?? null,
      reportsCount: g._count._all,
    };
  });

  // 3) Compute total companies matching the filters (for pagination)
  const allGroups = await prisma.report.groupBy({
    by: ["companyId"],
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

type PageProps = {
  // In Next.js 16, searchParams is a Promise and must be awaited
  searchParams: Promise<SearchParams>;
};

function buildPageUrl(
  base: string,
  page: number,
  filters: ResolvedFilters,
): string {
  const params = new URLSearchParams();

  params.set("page", String(page));

  if (filters.search) params.set("search", filters.search);
  if (filters.country) params.set("country", filters.country);
  if (filters.positionCategory) {
    params.set("category", categoryEnumToSlug(filters.positionCategory));
  }
  if (filters.seniority) {
    params.set("seniority", seniorityEnumToSlug(filters.seniority));
  }
  if (filters.stage) {
    params.set("stage", stageEnumToSlug(filters.stage));
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.15rem 0.5rem",
  borderRadius: 9999,
  border: "1px solid #d1d5db",
  background: "#f3f4f6",
  fontSize: "0.8rem",
  color: "#374151",
  gap: "0.25rem",
};

export default async function TopCompaniesPage({ searchParams }: PageProps) {
  // IMPORTANT: unwrap the Promise from Next.js
  const resolvedSearchParams = await searchParams;

  const filters = parseFilters(resolvedSearchParams);
  const { page, search, country, positionCategory, seniority, stage } = filters;

  const { items, totalPages, totalCompanies } = await getCompaniesPage(filters);
  const hasResults = items.length > 0;

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

      {/* Filter / search form (GET) */}
      <section
        style={{
          marginTop: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <form
          method="GET"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          {/* Company name search */}
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Search by company name
            </span>
            <input
              type="text"
              name="search"
              defaultValue={search ?? ""}
              placeholder="e.g. Acme"
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            />
          </label>

          {/* Country filter */}
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Country (optional)
            </span>
            <input
              type="text"
              name="country"
              defaultValue={country ?? ""}
              placeholder="e.g. Germany"
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            />
          </label>

          {/* Position category filter (slug-based) */}
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Position category
            </span>
            <select
              name="category"
              defaultValue={
                positionCategory ? categoryEnumToSlug(positionCategory) : ""
              }
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            >
              <option value="">All categories</option>
              {POSITION_CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={categoryEnumToSlug(cat)}>
                  {labelForCategory(cat)}
                </option>
              ))}
            </select>
          </label>

          {/* Stage filter */}
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Stage</span>
            <select
              name="stage"
              defaultValue={stage ? stageEnumToSlug(stage) : ""}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            >
              <option value="">All stages</option>
              {STAGE_OPTIONS.map((st) => (
                <option key={st} value={stageEnumToSlug(st)}>
                  {labelForStage(st)}
                </option>
              ))}
            </select>
          </label>

          {/* Seniority filter (slug-based JobLevel) */}
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Seniority
            </span>
            <select
              name="seniority"
              defaultValue={seniority ? seniorityEnumToSlug(seniority) : ""}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            >
              <option value="">All seniorities</option>
              {JOB_LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={seniorityEnumToSlug(lvl)}>
                  {labelForJobLevel(lvl)}
                </option>
              ))}
            </select>
          </label>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: 4,
                border: "none",
                background: "#111827",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                marginTop: "1.25rem",
              }}
            >
              Apply filters
            </button>
          </div>
        </form>
      </section>

      <section
        style={{
          marginBottom: "0.75rem",
        }}
      >
        {(search || country || positionCategory || seniority || stage) && (
          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: "0.85rem",
              color: "#4b5563",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                fontWeight: 500,
                marginRight: "0.25rem",
              }}
            >
              Active filters:
            </span>

            {search && (
              <span style={chipStyle}>
                {/* React escapes all values here, so it is safe */}
                <span>Search:</span>
                <strong>"{search}"</strong>
              </span>
            )}

            {country && (
              <span style={chipStyle}>
                <span>Country:</span>
                <strong>{country}</strong>
              </span>
            )}

            {positionCategory && (
              <span style={chipStyle}>
                <span>Category:</span>
                <strong>{labelForCategory(positionCategory)}</strong>
              </span>
            )}

            {seniority && (
              <span style={chipStyle}>
                <span>Seniority:</span>
                <strong>{labelForJobLevel(seniority)}</strong>
              </span>
            )}

            {stage && (
              <span style={chipStyle}>
                <span>Stage:</span>
                <strong>{labelForStage(stage)}</strong>
              </span>
            )}
          </div>
        )}
      </section>

      {/* Summary / empty state */}
      <section style={{ marginBottom: "1rem" }}>
        {hasResults ? (
          <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>
            Showing page <strong>{page}</strong> of{" "}
            <strong>{totalPages}</strong> ({totalCompanies} companies with at
            least one report).
          </p>
        ) : (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 6,
              border: "1px solid #fee2e2",
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: "0.9rem",
            }}
          >
            {search ? (
              <p>
                No companies found matching{" "}
                <strong>&quot;{search}&quot;</strong> with the selected filters.
                Try adjusting your search or removing some filters.
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

      {/* Table */}
      {hasResults && (
        <section style={{ marginBottom: "1.5rem" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  background: "#f3f4f6",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.5rem",
                    width: "3rem",
                  }}
                >
                  #
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Company
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Country
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "0.5rem",
                    width: "6rem",
                  }}
                >
                  Reports
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <td style={{ padding: "0.5rem" }}>
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{row.name}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {row.country ?? "Unknown"}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right" }}>
                    {row.reportsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Pagination */}
      {hasResults && (
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          <a
            href={buildPageUrl(
              "/top-companies",
              Math.max(1, page - 1),
              filters,
            )}
            style={{
              pointerEvents: page <= 1 ? "none" : "auto",
              opacity: page <= 1 ? 0.4 : 1,
              textDecoration: "underline",
              fontSize: "0.9rem",
            }}
          >
            Previous
          </a>

          <span style={{ fontSize: "0.9rem" }}>
            Page {page} / {totalPages}
          </span>

          <a
            href={buildPageUrl(
              "/top-companies",
              Math.min(totalPages, page + 1),
              filters,
            )}
            style={{
              pointerEvents: page >= totalPages ? "none" : "auto",
              opacity: page >= totalPages ? 0.4 : 1,
              textDecoration: "underline",
              fontSize: "0.9rem",
            }}
          >
            Next
          </a>
        </nav>
      )}
    </main>
  );
}
