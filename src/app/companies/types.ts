// src/app/companies/types.ts
import type {
  CountryCode,
  JobLevel,
  PositionCategory,
  Stage,
} from "@prisma/client";

/**
 * Shape of a single row in the "Top companies" table.
 * Each row represents a (company, country) pair with an aggregated report count.
 */
export type CompanyRow = {
  /** ID of the company (Company.id) */
  id: string;
  /** Human-readable company name */
  name: string;
  /** ISO 3166-1 alpha-2 country code for this slice of reports */
  country: CountryCode;
  /** Total number of reports for this (company, country) pair */
  reportsCount: number;
};

/**
 * Raw query-string parameters as they arrive from Next.js.
 * All values are strings (or undefined) and must be parsed/sanitised.
 */
export type SearchParams = {
  page?: string;
  search?: string;
  country?: string;
  category?: string;
  seniority?: string;
  stage?: string;
};

/**
 * Parsed and validated filters used by the data layer.
 * Fields are always present but may be undefined if no filter is active.
 */
export type ResolvedFilters = {
  /** 1-based page index, already clamped to [1, MAX_PAGE] */
  page: number;
  /** Optional free-text company search */
  search: string | undefined;
  /** Optional country filter (CountryCode enum) */
  country: CountryCode | undefined;
  /** Optional position category filter */
  positionCategory: PositionCategory | undefined;
  /** Optional seniority filter (JobLevel) */
  seniority: JobLevel | undefined;
  /** Optional pipeline stage filter */
  stage: Stage | undefined;
};

/**
 * Props for the filter form at the top of the page.
 */
export type CompaniesFilterFormProps = {
  /** Current filter values to pre-populate form controls */
  filters: ResolvedFilters;
};

/**
 * Props for the "Active filters" chip summary.
 */
export type CompaniesActiveFiltersProps = {
  /** Current filter values used to determine which chips to show */
  filters: ResolvedFilters;
};

/**
 * Props for the summary text / empty state block above the table.
 */
export type CompaniesResultSummaryProps = {
  /** Whether there is at least one row of data */
  hasResults: boolean;
  /** Current page index (1-based) */
  page: number;
  /** Total page count */
  totalPages: number;
  /** Total number of (company, country) rows that match the filters */
  totalCompanies: number;
  /** Optional search term to highlight in the empty state message */
  search: string | undefined;
};

/**
 * Props for the main results table.
 */
export type CompaniesTableProps = {
  /** Rows to render on the current page */
  items: CompanyRow[];
  /** Current page index (1-based), used to compute the row number column */
  page: number;
  /** Page size used for pagination, needed to compute absolute row numbers */
  pageSize: number;
};

/**
 * Props for the simple previous/next pagination controls.
 */
export type CompaniesPaginationProps = {
  /** Whether there is at least one row of data */
  hasResults: boolean;
  /** Current page index (1-based) */
  page: number;
  /** Total page count */
  totalPages: number;
  /** HREF for the "Previous" link, if any */
  previousHref: string | undefined;
  /** HREF for the "Next" link, if any */
  nextHref: string | undefined;
};
