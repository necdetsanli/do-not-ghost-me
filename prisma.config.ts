// prisma.config.ts
// Central Prisma CLI configuration (migrate, generate, studio, etc.)

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * Notes:
 * - `schema` points to the Prisma schema file used by the client and migrations.
 * - `migrations.path` controls where migration folders are written.
 * - `datasource.url` is the direct Postgres connection string used by the CLI.
 *   At runtime the application uses `src/env.ts` + `PrismaClient` from `src/lib/db.ts`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read directly from environment for CLI usage.
    // Throws if DATABASE_URL is missing, which is what we want here.
    url: env("DATABASE_URL"),
  },
});
