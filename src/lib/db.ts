// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // Use pg's connection pool with Prisma adapter
  const pool = new Pool({
    connectionString: databaseUrl,
    // You can tune pool options here if needed (max, idleTimeoutMillis, etc.)
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}

// Reuse the same PrismaClient in development to avoid exhausting connections
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
