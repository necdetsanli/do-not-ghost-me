import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalization";

/**
 * Minimal shape of a company record as used in the API layer.
 *
 * Note:
 * - Country information is not stored on the Company model.
 *   Each Report row carries its own CountryCode.
 */
export type CompanyForReport = {
  id: string;
  name: string;
  normalizedName: string;
};

/**
 * Finds or creates a company for a given report payload.
 *
 * Behavior:
 * - Normalizes the company name into a canonical `normalizedName` key.
 * - Reuses an existing company row if `normalizedName` already exists.
 * - Creates a new company when none exists, with the trimmed display name
 *   and the normalized key.
 *
 * This keeps company identity stable across slightly different spellings
 * ("Acme", "ACME", "Acme Corp"), while all location info stays on the
 * Report model itself.
 *
 * @param args - Arguments including the raw company name.
 * @param args.companyName - The company name as provided by the user.
 * @returns A minimal company object suitable for report creation.
 * @throws If the normalized company name is empty.
 */
export async function findOrCreateCompanyForReport(args: {
  companyName: string;
}): Promise<CompanyForReport> {
  const { companyName } = args;

  const normalizedName = normalizeCompanyName(companyName);

  if (normalizedName === "") {
    // Should not happen with validated input, but we guard defensively.
    throw new Error("Company name must not be empty after normalization.");
  }

  // 1) Try to find an existing company by canonical normalizedName.
  let company = await prisma.company.findUnique({
    where: { normalizedName },
    select: {
      id: true,
      name: true,
      normalizedName: true,
    },
  });

  // 2) Create if it does not exist.
  if (company === null) {
    company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        normalizedName,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
      },
    });
  }

  return company;
}
