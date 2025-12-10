// src/app/top-companies/_lib/url.ts
import {
  categoryEnumToSlug,
  seniorityEnumToSlug,
  stageEnumToSlug,
} from "@/lib/enums";
import type { ResolvedFilters } from "../types";

/**
 * Build a URL for a given page, preserving existing filter query parameters.
 *
 * This is used by the Top companies pagination controls to:
 * - switch pages while keeping the current filters,
 * - keep the URL as the single source of truth for filter state.
 *
 * @param base - Base pathname for the route (for example, "/top-companies").
 * @param page - 1-based page index that should be navigated to.
 * @param filters - Current resolved filters whose values should be encoded into the query string.
 * @returns A relative URL (pathname + query string) for the requested page and filters.
 */
export function buildPageUrl(
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
