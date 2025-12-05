// src/lib/company.ts
import { prisma } from "@/lib/db";
import { normalizeCompanyName, normalizeCountry } from "@/lib/normalization";

/**
 * Minimal shape of a company record as used in the API layer.
 */
export type CompanyForReport = {
  id: string;
  name: string;
  country: string | null;
  normalizedName: string;
};

/**
 * Find or create a company for a given report payload.
 *
 * - Normalizes the company name into `normalizedName` for uniqueness.
 * - Reuses an existing company row if `normalizedName` matches.
 * - If the existing company has no country but this request provides one,
 *   the country is updated.
 */
export async function findOrCreateCompanyForReport(args: {
  companyName: string;
  country: string | null | undefined;
}): Promise<CompanyForReport> {
  const { companyName, country } = args;

  const normalizedName = normalizeCompanyName(companyName);

  if (normalizedName === "") {
    // This should not happen if input validation is correct,
    // but we guard here defensively.
    throw new Error("Company name must not be empty after normalization.");
  }

  const normalizedCountry = normalizeCountry(country);

  // 1) Try to find existing company by canonical normalizedName
  let company = await prisma.company.findUnique({
    where: { normalizedName },
    select: {
      id: true,
      name: true,
      country: true,
      normalizedName: true,
    },
  });

  // 2) Create if it does not exist
  if (company == null) {
    company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        normalizedName,
        country: normalizedCountry,
      },
      select: {
        id: true,
        name: true,
        country: true,
        normalizedName: true,
      },
    });

    return company;
  }

  // 3) If we have no country yet but this request provides one, update it
  if (company.country == null && normalizedCountry !== null) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        country: normalizedCountry,
      },
      select: {
        id: true,
        name: true,
        country: true,
        normalizedName: true,
      },
    });
  }

  return company;
}
