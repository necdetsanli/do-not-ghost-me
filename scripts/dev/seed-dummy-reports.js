#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Development-only seed script to generate a large set of dummy reports.
 *
 * This script:
 * - Requires a valid DATABASE_URL pointing to a **development** Postgres instance.
 * - Refuses to run when NODE_ENV is not "development".
 * - Clears existing companies and reports.
 * - Inserts a wide, noisy distribution of report counts across many companies
 *   to stress-test /top-companies aggregation and ranking logic.
 *
 * IMPORTANT:
 * - Never run this against a production database.
 * - This script is intentionally destructive (deleteMany on Report + Company).
 */

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
// Constants
// -----------------------------------------------------------------------------

/** @type {number} Total number of companies to generate. */
const TOTAL_COMPANIES = 200;

/** @type {number} Base minimum report count per company. */
const BASE_REPORTS_MIN = 5;

/** @type {number} Range for the base report count (BASE_REPORTS_MIN..BASE_REPORTS_MIN+BASE_REPORTS_SPREAD-1). */
const BASE_REPORTS_SPREAD = 40;

/** @type {number} Maximum multiplier for report counts per company (1..REPORT_MULTIPLIER_MAX). */
const REPORT_MULTIPLIER_MAX = 5;

/** @type {number} Maximum days without reply for seeded reports. */
const MAX_DAYS_WITHOUT_REPLY = 180;

// -----------------------------------------------------------------------------
// Helpers: company name normalization
// -----------------------------------------------------------------------------

/**
 * Collapse whitespace and trim for display names.
 * For example: "  Acme   Corp  " -> "Acme Corp"
 *
 * @param {string} raw - Raw company name as stored in the seed generator.
 * @returns {string} Normalized display name with collapsed whitespace.
 */
function normalizeCompanyNameForDisplay(raw) {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Normalized key used for deduplication / uniqueness.
 * For example: "Acme Corp" -> "acme corp"
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
    `[seed] Refusing to run because NODE_ENV is '${process.env.NODE_ENV}'. Expected 'development'.`,
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

/**
 * Single PrismaClient instance for this process.
 * Note: Logging is disabled here to keep output concise; enable if needed.
 */
const prisma = new PrismaClient({
  adapter,
});

// -----------------------------------------------------------------------------
// Main seed routine
// -----------------------------------------------------------------------------

/**
 * Main entrypoint for the development seed script.
 *
 * Steps:
 * 1. Wipe existing Report and Company data (destructive).
 * 2. Insert a fixed number of companies with normalized names.
 * 3. For each company, insert a derived number of reports to create
 *    a wide distribution of counts for ranking stress-tests.
 *
 * @returns {Promise<void>} Resolves when seeding is complete.
 */
async function main() {
  console.log("[seed] Starting dummy data generation for a large scenario...");

  console.log("[seed] Deleting existing reports and companies (destructive)...");
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
    // - base: BASE_REPORTS_MIN..(BASE_REPORTS_MIN + BASE_REPORTS_SPREAD - 1)
    // - multiplier: 1..REPORT_MULTIPLIER_MAX
    // => reportCount roughly in [5, ~200+]
    const baseReports = BASE_REPORTS_MIN + (i % BASE_REPORTS_SPREAD);
    const multiplier = 1 + (i % REPORT_MULTIPLIER_MAX);
    const reportCount = baseReports * multiplier;

    totalReports += reportCount;

    const company = await prisma.company.create({
      data: {
        name: companyName,
        normalizedName,
      },
    });

    /** @type {import("@prisma/client").Prisma.ReportCreateManyInput[]} */
    const batch = [];

    for (let j = 0; j < reportCount; j += 1) {
      batch.push({
        companyId: company.id,
        stage: stages[(i + j) % stages.length],
        jobLevel: levels[(i + j) % levels.length],
        positionCategory: categories[(i + j) % categories.length],
        positionDetail: `Dummy position ${(j % 7) + 1}`,
        daysWithoutReply: 1 + ((i + j) % MAX_DAYS_WITHOUT_REPLY),
        country: countries[(i + j) % countries.length],
      });
    }

    // Note: reportCount is bounded and this is safe for a single createMany.
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

void main()
  .catch((err) => {
    console.error("[seed] Error while seeding dummy data:", err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("[seed] Error while disconnecting Prisma client:", disconnectError);
    }

    try {
      await pool.end();
    } catch (poolError) {
      console.error("[seed] Error while closing Postgres pool:", poolError);
    }
  });
