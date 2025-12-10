// src/lib/rateLimitError.ts

/**
 * Narrow reasons for why a report was rate limited.
 *
 * Extending this union is the preferred way to add new
 * rate-limit categories in the future.
 */
export type RateLimitReason =
  | "missing-ip"
  | "company-position-limit"
  | "daily-ip-limit"
  | "unknown";

/**
 * Default HTTP status code for rate-limit responses.
 *
 * Keeping this as a constant avoids magic numbers in constructors
 * and makes it easier to adjust globally if needed.
 */
export const DEFAULT_RATE_LIMIT_STATUS_CODE = 429;

/**
 * Shared message for missing-client-IP situations.
 * Keeping this as a constant ensures consistency across modules.
 */
export const MISSING_IP_MESSAGE = "Client IP is required to submit a report.";

/**
 * Domain-specific error for report-related rate limits.
 *
 * This is intentionally separate from generic HTTP or transport
 * errors so that callers can safely catch and map it to a 429
 * response (or similar) without accidentally hiding real failures.
 */
export class ReportRateLimitError extends Error {
  /**
   * Machine-readable reason describing why the rate limit was triggered.
   */
  public readonly reason: RateLimitReason;

  /**
   * HTTP status code associated with this rate-limit error.
   */
  public readonly statusCode: number;

  /**
   * Creates a new ReportRateLimitError.
   *
   * @param message - Human-readable error message, safe to expose to clients.
   * @param reason - Machine-readable reason code describing the limit type.
   * @param statusCode - HTTP status code to associate with the error (defaults to 429).
   */
  constructor(
    message: string,
    reason: RateLimitReason,
    statusCode: number = DEFAULT_RATE_LIMIT_STATUS_CODE,
  ) {
    super(message);

    this.name = "ReportRateLimitError";
    this.reason = reason;
    this.statusCode = statusCode;

    // Ensure the prototype chain is correctly set when targeting older runtimes.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Type guard to check whether an unknown error value
 * is a ReportRateLimitError.
 *
 * @param error - The unknown error value to inspect.
 * @returns True if the error is an instance of ReportRateLimitError, false otherwise.
 */
export function isReportRateLimitError(
  error: unknown,
): error is ReportRateLimitError {
  return error instanceof ReportRateLimitError;
}
