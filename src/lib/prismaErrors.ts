/**
 * Checks whether an unknown error value looks like a Prisma error
 * with the given error code (e.g. "P2002").
 *
 * This avoids importing Prisma client error classes everywhere and keeps
 * error handling lightweight at call sites.
 *
 * @param error - The unknown error value to inspect.
 * @param code - The Prisma error code to match (e.g. "P2002").
 * @returns True if the error has a matching Prisma `code` property, false otherwise.
 */
export function hasPrismaErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorWithCode = error as { code?: unknown };

  return typeof errorWithCode.code === "string" && errorWithCode.code === code;
}
