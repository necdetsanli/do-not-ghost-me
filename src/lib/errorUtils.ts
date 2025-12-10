// src/lib/errorUtils.ts

/**
 * Safely formats an unknown error value into a string for logging.
 *
 * - If the value is an Error instance, returns its message.
 * - Otherwise attempts to coerce to string.
 * - Falls back to a fixed placeholder when even that fails.
 *
 * @param error - The unknown error value to format.
 * @returns A best-effort string representation of the error.
 */
export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return String(error);
  } catch {
    return "[unstringifiable-error]";
  }
}
