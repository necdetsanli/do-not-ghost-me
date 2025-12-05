// src/lib/prismaErrors.ts

/**
 * Check whether an unknown error value looks like a Prisma error
 * with the given error code (e.g. "P2002").
 *
 * This avoids importing Prisma client error classes everywhere.
 */
export function hasPrismaErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorWithCode = error as { code?: unknown };

  return typeof errorWithCode.code === "string" && errorWithCode.code === code;
}
