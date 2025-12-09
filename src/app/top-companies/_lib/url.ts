// src/app/top-companies/_lib/url.ts
import {
  categoryEnumToSlug,
  seniorityEnumToSlug,
  stageEnumToSlug,
} from "@/lib/enums";
import type { ResolvedFilters } from "../types";

/**
 * Build a URL for a given page, preserving existing filter query parameters.
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
