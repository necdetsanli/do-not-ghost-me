// src/app/top-companies/_lib/data.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ResolvedFilters, TopCompanyRow } from "../types";
import { PAGE_SIZE } from "./constants";

/**
 * Fetch one page of "top companies" and basic pagination metadata.
 *
 * The query:
 * - applies filters on the Report table (and related Company),
 * - groups by companyId,
 * - orders by descending report count,
 * - looks up company names + country for the current page,
 * - computes total row count for pagination.
 *
 */
export async function getCompaniesPage(filters: ResolvedFilters): Promise<{
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

  const grouped = await prisma.report.groupBy({
    by: ["companyId"],
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

  const items: TopCompanyRow[] = grouped.map((g) => {
    type CountAll = { _all: number };

    const countAll =
      typeof g._count === "object" && g._count !== null
        ? (g._count as CountAll)._all
        : 0;

    const meta = companyMap.get(g.companyId);

    if (meta === undefined) {
      throw new Error(
        `Company record not found for companyId=${g.companyId} while building top-companies page.`,
      );
    }

    return {
      id: g.companyId,
      name: meta.name,
      country: meta.country,
      reportsCount: countAll,
    };
  });

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
