// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";

/**
 * Create a new PrismaClient instance configured with the PostgreSQL driver adapter.
 *
 * In most of the application you should use the exported `prisma` singleton
 * instead of calling this function directly. This helper exists primarily for
 * testing, scripts, or tooling where you explicitly want a fresh client.
 *
 * @returns A new PrismaClient instance using the shared connection pool.
 */
export function createPrismaClient(): PrismaClient {
  const pool: Pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  const adapter: PrismaPg = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    /**
     * In development we keep warnings + errors with pretty formatting for easier debugging.
     * In production we reduce log noise and avoid overly verbose error output.
     */
    log: env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    errorFormat: env.NODE_ENV === "production" ? "minimal" : "pretty",
  });
}

// Use globalThis to avoid creating multiple PrismaClient instances in dev / watch mode.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

/**
 * Shared PrismaClient singleton for the application.
 *
 * In non-production environments this instance is cached on `globalThis`
 * to avoid exhausting database connections during hot reloads.
 * Always prefer importing this singleton in API routes and server components.
 */
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
