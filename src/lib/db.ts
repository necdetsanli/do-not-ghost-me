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
 */
export function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    // In production we reduce log noise; in dev we also keep "warn".
    log: env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
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
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
