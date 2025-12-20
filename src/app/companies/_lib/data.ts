// src/app/companies/_lib/data.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalization";
import type { ResolvedFilters, CompanyRow } from "../types";
import { PAGE_SIZE } from "./constants";

/**
 * Stable, deterministic comparator for CompanyRow items.
 *
 * Sort order:
 * 1) reportsCount DESC
 * 2) normalizedName ASC (case/spacing/punctuation-insensitive via normalizeCompanyName)
 * 3) id ASC (final tiebreaker)
 *
 * @param a - First item.
 * @param b - Second item.
 * @returns Negative if a < b, positive if a > b, zero if equal.
 */
function compareCompanyRowsStable(a: CompanyRow, b: CompanyRow): number {
  if (a.reportsCount !== b.reportsCount) {
    return b.reportsCount - a.reportsCount;
  }

  const aNorm: string = normalizeCompanyName(a.name);
  const bNorm: string = normalizeCompanyName(b.name);

  if (aNorm !== bNorm) {
    return aNorm < bNorm ? -1 : 1;
  }

  if (a.id === b.id) {
    return 0;
  }

  return a.id < b.id ? -1 : 1;
}

/**
 * Fetch one page of "companies" and basic pagination metadata.
 *
 * Important ordering note:
 * To guarantee stable pagination, we apply the full ordering BEFORE slicing:
 * - reportCount DESC
 * - normalized company name ASC
 * - id ASC
 *
 * This avoids unstable tie ordering that can cause rows to "jump" between pages.
 *
 * @param filters - Resolved and validated filters (page, search, country,
 *                  positionCategory, seniority, stage) used to restrict the
 *                  underlying Report/Company query.
 * @returns A promise that resolves to an object containing:
 *          - items: current page rows with company id, name, country and
 *            aggregated report count,
 *          - totalPages: total number of pages given PAGE_SIZE,
 *          - totalCompanies: total number of companies that match the filters.
 * @throws {Error} If a company record is unexpectedly missing for a grouped
 *                 companyId while building the page.
 */
export async function getCompaniesPage(filters: ResolvedFilters): Promise<{
  items: CompanyRow[];
  totalPages: number;
  totalCompanies: number;
}> {
  const { page, search, country, positionCategory, seniority, stage } = filters;
  const safePage: number = page > 0 ? page : 1;
  const skip: number = (safePage - 1) * PAGE_SIZE;

  const where: Prisma.ReportWhereInput = {
    status: "ACTIVE",
  };

  const companyWhere: Prisma.CompanyWhereInput = {};

  if (search !== undefined && search !== "") {
    companyWhere.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (country !== undefined) {
    companyWhere.country = country;
  }

  if (Object.keys(companyWhere).length > 0) {
    where.company = companyWhere;
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

  /**
   * We group ALL matching reports first (no skip/take here),
   * then apply stable ordering and slice for pagination.
   *
   * This ensures ties do not shuffle between page loads or deployments.
   */
  const grouped = await prisma.report.groupBy({
    by: ["companyId"],
    where,
    _count: {
      _all: true,
    },
    orderBy: [
      {
        _count: {
          id: "desc",
        },
      },
      /**
       * Deterministic baseline tie-breaker at the DB level.
       * Final user-facing tie-breaker is applied after we load company names.
       */
      {
        companyId: "asc",
      },
    ],
  });

  const companyIds: string[] = grouped.map((g) => g.companyId);

  if (companyIds.length === 0) {
    return { items: [], totalPages: 1, totalCompanies: 0 };
  }

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

  const companyMap = new Map<
    string,
    {
      name: string;
      country: (typeof companies)[number]["country"];
    }
  >(
    companies.map((c) => [
      c.id,
      {
        name: c.name,
        country: c.country,
      },
    ]),
  );

  const allItems: CompanyRow[] = grouped.map((g) => {
    type CountAll = { _all: number };

    const countAll: number =
      typeof g._count === "object" && g._count !== null ? (g._count as CountAll)._all : 0;

    const meta = companyMap.get(g.companyId);

    if (meta === undefined) {
      throw new Error(
        `Company record not found for companyId=${g.companyId} while building companies page.`,
      );
    }

    return {
      id: g.companyId,
      name: meta.name,
      country: meta.country,
      reportsCount: countAll,
    };
  });

  allItems.sort(compareCompanyRowsStable);

  const totalCompanies: number = allItems.length;

  const totalPages: number =
    totalCompanies === 0 ? 1 : Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));

  const items: CompanyRow[] = allItems.slice(skip, skip + PAGE_SIZE);

  return { items, totalPages, totalCompanies };
}
