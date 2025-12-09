// src/lib/company.ts
import type { CountryCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalization";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { isPrismaUniqueViolation } from "@/lib/prismaErrors";

/**
 * Minimal shape of a company record as used in the API layer.
 *
 * Notes:
 * - Company is now scoped by (normalizedName, country).
 * - The same normalized name may exist in multiple countries,
 *   but only once per (normalizedName, country) pair.
 */
export type CompanyForReport = {
  id: string;
  name: string;
  normalizedName: string;
  country: CountryCode;
};

/**
 * Finds or creates a company for a given report payload.
 *
 * Behavior:
 * - Normalizes the company name into a canonical `normalizedName` key.
 * - Uses (normalizedName, country) as the lookup key.
 * - Reuses an existing company row if that pair already exists.
 * - Creates a new company otherwise.
 *
 * Concurrency hardening:
 * - First attempts a read (findUnique).
 * - If no row exists, attempts a create.
 * - If the create hits a unique constraint (P2002), it re-reads the row and
 *   returns the existing company instead of bubbling up a 500.
 *
 * @param args.companyName - The company name as provided by the user.
 * @param args.country - CountryCode for this report (and company scope).
 * @throws If the normalized company name is empty, or if the database layer
 *         fails in a non-recoverable way.
 */
export async function findOrCreateCompanyForReport(args: {
  companyName: string;
  country: CountryCode;
}): Promise<CompanyForReport> {
  const { companyName, country } = args;
  const trimmedName = companyName.trim();
  const normalizedName = normalizeCompanyName(companyName);

  if (normalizedName === "") {
    // Should not happen with validated input, but we guard defensively.
    logError(
      "Company name is empty after normalization. This should not happen with validated input.",
      { rawCompanyName: companyName },
    );
    throw new Error("Company name must not be empty after normalization.");
  }

  // ---------------------------------------------------------------------------
  // 1) Fast-path: try to reuse an existing company by (normalizedName, country)
  // ---------------------------------------------------------------------------
  const existing = await prisma.company.findUnique({
    where: {
      // Assumes: @@unique([normalizedName, country]) in schema.prisma
      uniq_company_name_country: {
        normalizedName,
        country,
      },
    },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      country: true,
    },
  });

  if (existing !== null) {
    return existing;
  }

  // ---------------------------------------------------------------------------
  // 2) Slow-path: create a new company, with concurrency protection
  // ---------------------------------------------------------------------------
  try {
    const created = await prisma.company.create({
      data: {
        name: trimmedName,
        normalizedName,
        country,
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        country: true,
      },
    });

    logInfo("Created new company for report", {
      companyId: created.id,
      normalizedName: created.normalizedName,
      country: created.country,
    });

    return created;
  } catch (error) {
    // P2002 => unique constraint violation (likely another request created it
    // in the small window between findUnique and create).
    if (isPrismaUniqueViolation(error)) {
      logWarn(
        "Detected concurrent company creation race; reusing existing company row.",
        { normalizedName, country },
      );

      const concurrent = await prisma.company.findUnique({
        where: {
          uniq_company_name_country: {
            normalizedName,
            country,
          },
        },
        select: {
          id: true,
          name: true,
          normalizedName: true,
          country: true,
        },
      });

      if (concurrent !== null) {
        return concurrent;
      }

      logError(
        "Unique constraint error for company, but no row found after retry.",
        { normalizedName, country },
      );
    } else {
      logError("Failed to create company for report", {
        normalizedName,
        country,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}
