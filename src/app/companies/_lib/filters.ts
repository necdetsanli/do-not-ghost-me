// src/app/companies/_lib/filters.ts
import type { CountryCode } from "@prisma/client";
import {
  COUNTRY_OPTIONS,
  categorySlugToEnum,
  senioritySlugToEnum,
  stageSlugToEnum,
} from "@/lib/enums";
import type { ResolvedFilters, SearchParams } from "../types";
import { MAX_PAGE } from "./constants";

/**
 * Parse and sanitise raw search parameters from the URL.
 *
 * This is the single place where we trust query-string input and convert it
 * into a strongly typed ResolvedFilters object used by the data layer.
 *
 * @param searchParams - Raw URL search parameters as provided by Next.js
 *                       (all values are strings or undefined).
 * @returns A ResolvedFilters object with:
 *          - page clamped to [1, MAX_PAGE],
 *          - search truncated and normalised,
 *          - enum-like filters (country, category, seniority, stage) resolved
 *            from their slug or query representation.
 */
export function parseFilters(searchParams?: SearchParams): ResolvedFilters {
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
    categorySlugRaw === "" || categorySlugRaw === "all" ? undefined : categorySlugRaw;
  const positionCategory =
    categorySlug !== undefined ? categorySlugToEnum(categorySlug) : undefined;

  const senioritySlugRaw = (searchParams?.seniority ?? "").trim().toLowerCase();
  const senioritySlug =
    senioritySlugRaw === "" || senioritySlugRaw === "all" ? undefined : senioritySlugRaw;
  const seniority = senioritySlug !== undefined ? senioritySlugToEnum(senioritySlug) : undefined;

  const stageSlugRaw = (searchParams?.stage ?? "").trim().toLowerCase();
  const stageSlug = stageSlugRaw === "" || stageSlugRaw === "all" ? undefined : stageSlugRaw;
  const stage = stageSlug !== undefined ? stageSlugToEnum(stageSlug) : undefined;

  return {
    page,
    search,
    country,
    positionCategory,
    seniority,
    stage,
  };
}
