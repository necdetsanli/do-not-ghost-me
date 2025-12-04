#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */

// Development-only seed script to generate a large set of dummy reports
// for testing the /top-companies aggregation logic with many companies.

require("dotenv/config");

const {
  PrismaClient,
  Stage,
  JobLevel,
  PositionCategory,
} = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[seed] DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV !== "development") {
    console.error(
      "[seed] Refusing to run because NODE_ENV is not 'development'.",
    );
    process.exit(1);
  }

  console.log("[seed] Starting dummy data generation for a large scenario...");

  console.log("[seed] Deleting existing reports and companies...");
  await prisma.report.deleteMany({});
  await prisma.company.deleteMany({});

  const TOTAL_COMPANIES = 200;

  const countries = [
    "United States",
    "Germany",
    "United Kingdom",
    "France",
    "Netherlands",
    "Sweden",
    "Canada",
    "Turkey",
    "Japan",
    "India",
  ];

  const stages = Object.values(Stage);
  const levels = Object.values(JobLevel);
  const categories = Object.values(PositionCategory);

  let totalReports = 0;

  console.log(
    `[seed] Will create ${TOTAL_COMPANIES} companies with varying report counts...`,
  );

  for (let i = 0; i < TOTAL_COMPANIES; i++) {
    const index = i + 1;
    const name = `Test Company ${String(index).padStart(3, "0")}`;
    const country = countries[i % countries.length];

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
        name,
        country,
      },
    });

    const batch = [];

    for (let j = 0; j < reportCount; j++) {
      batch.push({
        companyId: company.id,
        stage: stages[(i + j) % stages.length],
        jobLevel: levels[(i + j) % levels.length],
        positionCategory: categories[(i + j) % categories.length],
        positionDetail: `Dummy position ${(j % 7) + 1}`,
        daysWithoutReply: 1 + ((i + j) % 180),
        country,
      });
    }

    await prisma.report.createMany({ data: batch });

    if (index % 25 === 0 || index === TOTAL_COMPANIES) {
      console.log(
        `[seed] Seeded company ${index}/${TOTAL_COMPANIES} (${name}) with ${reportCount} reports.`,
      );
    }
  }

  console.log(
    `[seed] Dummy data generation finished successfully: ${TOTAL_COMPANIES} companies, ${totalReports} reports.`,
  );
}

main()
  .catch((err) => {
    console.error("[seed] Error while seeding dummy data:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
