#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */

// scripts/seed-large-scenario.js
// Development-only seed script to generate a large set of dummy reports
// for testing the /top-companies aggregation logic with many companies.

require("dotenv/config");

const {
  PrismaClient,
  Stage,
  JobLevel,
  PositionCategory,
  CountryCode,
} = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// -----------------------------------------------------------------------------
// Helpers: company name normalization
// -----------------------------------------------------------------------------

/**
 * Collapse whitespace and trim for a nice display name.
 * e.g. "  Acme   Corp  " -> "Acme Corp"
 *
 * @param {string} raw - Raw company name as stored in the seed generator.
 * @returns {string} Normalized display name with collapsed whitespace.
 */
function normalizeCompanyNameForDisplay(raw) {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Normalized key used for deduplication / uniqueness.
 * e.g. "Acme Corp" -> "acme corp"
 *
 * @param {string} raw - Raw company name.
 * @returns {string} Lowercased normalized key for uniqueness checks.
 */
function normalizeCompanyNameForKey(raw) {
  return normalizeCompanyNameForDisplay(raw).toLowerCase();
}

// -----------------------------------------------------------------------------
// Environment & Prisma setup
// -----------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (typeof connectionString !== "string" || connectionString.trim() === "") {
  console.error("[seed] DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

if (process.env.NODE_ENV !== "development") {
  console.error(
    "[seed] Refusing to run because NODE_ENV is not 'development'.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// -----------------------------------------------------------------------------
// Main seed routine
// -----------------------------------------------------------------------------

const TOTAL_COMPANIES = 200;

/**
 * Main entrypoint for the development seed script.
 * - Clears existing companies/reports
 * - Inserts a controlled set of companies
 * - Creates a “noisy” distribution of report counts per company
 */
async function main() {
  console.log("[seed] Starting dummy data generation for a large scenario...");

  console.log("[seed] Deleting existing reports and companies...");
  await prisma.report.deleteMany({});
  await prisma.company.deleteMany({});

  const stages = Object.values(Stage);
  const levels = Object.values(JobLevel);
  const categories = Object.values(PositionCategory);
  const countries = Object.values(CountryCode);

  let totalReports = 0;

  console.log(
    `[seed] Will create ${TOTAL_COMPANIES} companies with varying report counts...`,
  );

  for (let i = 0; i < TOTAL_COMPANIES; i += 1) {
    const index = i + 1;
    const rawName = `Test Company ${String(index).padStart(3, "0")}`;
    const companyName = normalizeCompanyNameForDisplay(rawName);
    const normalizedName = normalizeCompanyNameForKey(rawName);

    // Create a "wide and noisy" distribution of report counts:
    // - base: 5..44 (mod 40)
    // - multiplier: 1..5 (mod 5)
    // => reportCount in a rough range of 5..220
    // This creates overlaps (some companies share the same count),
    // but overall the distribution is fairly wide.
    const baseReports = 5 + (i % 40);
    const multiplier = 1 + (i % 5);
    const reportCount = baseReports * multiplier;

    totalReports += reportCount;

    const company = await prisma.company.create({
      data: {
        name: companyName,
        normalizedName,
      },
    });

    const batch = [];

    for (let j = 0; j < reportCount; j += 1) {
      batch.push({
        companyId: company.id,
        stage: stages[(i + j) % stages.length],
        jobLevel: levels[(i + j) % levels.length],
        positionCategory: categories[(i + j) % categories.length],
        positionDetail: `Dummy position ${(j % 7) + 1}`,
        daysWithoutReply: 1 + ((i + j) % 180),
        country: countries[(i + j) % countries.length],
      });
    }

    await prisma.report.createMany({ data: batch });

    if (index % 25 === 0 || index === TOTAL_COMPANIES) {
      console.log(
        `[seed] Seeded company ${index}/${TOTAL_COMPANIES} (${companyName}) with ${reportCount} reports.`,
      );
    }
  }

  console.log(
    `[seed] Dummy data generation finished successfully: ${TOTAL_COMPANIES} companies, ${totalReports} reports.`,
  );
}

// -----------------------------------------------------------------------------
// Entrypoint
// -----------------------------------------------------------------------------

main()
  .catch((err) => {
    console.error("[seed] Error while seeding dummy data:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
