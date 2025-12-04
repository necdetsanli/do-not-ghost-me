// prisma.config.ts
// This file configures Prisma CLI (migrate, generate, studio, etc.)
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // This is the *direct* Postgres connection used by Prisma CLI
  datasource: {
    url: env("DATABASE_URL"),
  },
});
