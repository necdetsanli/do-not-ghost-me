// prisma.config.ts

/**
 * Prisma CLI configuration for migrations, client generation and Studio.
 *
 * This file is ONLY used by Prisma CLI tooling (e.g. `prisma migrate dev`,
 * `prisma generate`, `prisma studio`). The runtime application should import
 * configuration and environment variables from `src/env.ts` instead.
 *
 * Design goals:
 * - Single source of truth for Prisma schema and migrations folder.
 * - Fail-fast if the CLI is executed without a valid DATABASE_URL.
 * - Keep CLI configuration isolated from application runtime config.
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  /**
   * Absolute or relative path to the Prisma schema used by both
   * the generated client and migrations.
   */
  schema: "prisma/schema.prisma",

  /**
   * Filesystem location where Prisma will store migration directories.
   * This folder is safe to commit to version control.
   */
  migrations: {
    path: "prisma/migrations",
  },

  /**
   * Datasource configuration for Prisma CLI operations.
   *
   * Notes:
   * - `env("DATABASE_URL")` throws at load time if the variable is not set,
   *   which is the preferred behavior for CI and local development because it
   *   fails fast and prevents accidental migrations against the wrong database.
   * - The application runtime uses `src/env.ts` and `src/lib/db.ts` to create
   *   the PrismaClient; do not import this file from application code.
   */
  datasource: {
    url: env("DATABASE_URL"),
  },
});
