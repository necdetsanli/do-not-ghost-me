// src/app/top-companies/TopCompaniesComponents.tsx

import type { CSSProperties, JSX } from "react";
import type { CountryCode } from "@prisma/client";
import {
  POSITION_CATEGORY_OPTIONS,
  JOB_LEVEL_OPTIONS,
  STAGE_OPTIONS,
  COUNTRY_OPTIONS,
  labelForCategory,
  labelForJobLevel,
  labelForStage,
  labelForCountry,
  categoryEnumToSlug,
  seniorityEnumToSlug,
  stageEnumToSlug,
} from "@/lib/enums";
import type {
  TopCompaniesActiveFiltersProps,
  TopCompaniesFilterFormProps,
  TopCompaniesPaginationProps,
  TopCompaniesResultSummaryProps,
  TopCompaniesTableProps,
} from "./types";

/**
 * Shared styles for form labels.
 */
const formLabelStyle: CSSProperties = {
  display: "grid",
  gap: "0.25rem",
};

/**
 * Shared styles for form controls.
 */
const formControlStyle: CSSProperties = {
  padding: "0.45rem 0.6rem",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  fontSize: "0.9rem",
};

/**
 * Shared styles for small "chip" badges used in the active filter summary.
 */
const chipStyle: CSSProperties = {
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

/**
 * Render the filter/search form at the top of the page.
 * Uses a GET form so filters are reflected in the URL.
 */
export function TopCompaniesFilterForm(
  props: TopCompaniesFilterFormProps,
): JSX.Element {
  const { filters } = props;
  const { search, country, positionCategory, seniority, stage } = filters;

  return (
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
        <label style={formLabelStyle}>
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Search by company name
          </span>
          <input
            type="text"
            name="search"
            defaultValue={search ?? ""}
            placeholder="e.g. Acme"
            style={formControlStyle}
          />
        </label>

        {/* Country filter (CountryCode enum via dropdown) */}
        <label style={formLabelStyle}>
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Country (optional)
          </span>
          <select
            name="country"
            defaultValue={country ?? ""}
            style={formControlStyle}
          >
            <option value="">All countries</option>
            {COUNTRY_OPTIONS.map((code: CountryCode) => (
              <option key={code} value={code}>
                {labelForCountry(code)}
              </option>
            ))}
          </select>
        </label>

        {/* Position category filter (slug-based) */}
        <label style={formLabelStyle}>
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Position category
          </span>
          <select
            name="category"
            defaultValue={
              positionCategory !== undefined
                ? categoryEnumToSlug(positionCategory)
                : ""
            }
            style={formControlStyle}
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
        <label style={formLabelStyle}>
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Stage</span>
          <select
            name="stage"
            defaultValue={stage !== undefined ? stageEnumToSlug(stage) : ""}
            style={formControlStyle}
          >
            <option value="">All stages</option>
            {STAGE_OPTIONS.map((st) => (
              <option key={st} value={stageEnumToSlug(st)}>
                {labelForStage(st)}
              </option>
            ))}
          </select>
        </label>

        {/* Seniority filter (JobLevel) */}
        <label style={formLabelStyle}>
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Seniority
          </span>
          <select
            name="seniority"
            defaultValue={
              seniority !== undefined ? seniorityEnumToSlug(seniority) : ""
            }
            style={formControlStyle}
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
  );
}

/**
 * Render a chip-style summary of currently active filters.
 */
export function TopCompaniesActiveFilters(
  props: TopCompaniesActiveFiltersProps,
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
    return <section style={{ marginBottom: "0.75rem" }} />;
  }

  return (
    <section
      style={{
        marginBottom: "0.75rem",
      }}
    >
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

        {search !== undefined && search !== "" && (
          <span style={chipStyle}>
            <span>Search:</span>
            <strong>&quot;{search}&quot;</strong>
          </span>
        )}

        {country !== undefined && (
          <span style={chipStyle}>
            <span>Country:</span>
            <strong>{labelForCountry(country)}</strong>
          </span>
        )}

        {positionCategory !== undefined && (
          <span style={chipStyle}>
            <span>Category:</span>
            <strong>{labelForCategory(positionCategory)}</strong>
          </span>
        )}

        {seniority !== undefined && (
          <span style={chipStyle}>
            <span>Seniority:</span>
            <strong>{labelForJobLevel(seniority)}</strong>
          </span>
        )}

        {stage !== undefined && (
          <span style={chipStyle}>
            <span>Stage:</span>
            <strong>{labelForStage(stage)}</strong>
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * Render the summary text / empty-state notice above the table.
 */
export function TopCompaniesResultSummary(
  props: TopCompaniesResultSummaryProps,
): JSX.Element {
  const { hasResults, page, totalPages, totalCompanies, search } = props;

  return (
    <section style={{ marginBottom: "1rem" }}>
      {hasResults ? (
        <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>{" "}
          ({totalCompanies} company–country entries with at least one report).
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

/**
 * Render the main results table for the "Top companies" listing.
 */
export function TopCompaniesTable(props: TopCompaniesTableProps): JSX.Element {
  const { items, page, pageSize } = props;

  return (
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
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Company</th>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Country</th>
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
              key={`${row.id}-${row.country}`}
              style={{
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <td style={{ padding: "0.5rem" }}>
                {(page - 1) * pageSize + index + 1}
              </td>
              <td style={{ padding: "0.5rem" }}>{row.name}</td>
              <td style={{ padding: "0.5rem" }}>
                {labelForCountry(row.country)}
              </td>
              <td style={{ padding: "0.5rem", textAlign: "right" }}>
                {row.reportsCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Render a simple "Previous / Next" pagination section.
 * Links are precomputed in the page component.
 */
export function TopCompaniesPagination(
  props: TopCompaniesPaginationProps,
): JSX.Element {
  const { hasResults, page, totalPages, previousHref, nextHref } = props;

  if (!hasResults) {
    return <nav />;
  }

  const prevDisabled = page <= 1 || previousHref == null;
  const nextDisabled = page >= totalPages || nextHref == null;

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginTop: "0.5rem",
      }}
    >
      <a
        href={previousHref ?? "#"}
        style={{
          pointerEvents: prevDisabled ? "none" : "auto",
          opacity: prevDisabled ? 0.4 : 1,
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
        href={nextHref ?? "#"}
        style={{
          pointerEvents: nextDisabled ? "none" : "auto",
          opacity: nextDisabled ? 0.4 : 1,
          textDecoration: "underline",
          fontSize: "0.9rem",
        }}
      >
        Next
      </a>
    </nav>
  );
}
