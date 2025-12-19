import net from "node:net";
import { z } from "zod";

/**
 * Allowed sources for company intelligence lookups coming from the browser extension.
 */
const COMPANY_INTEL_SOURCES = [
  "linkedin",
  "glassdoor",
  "indeed",
  "workable",
  "domain",
] as const;

/**
 * Zod schema for the source query parameter.
 * Normalizes casing to lower-case before validation.
 */
const normalizedSourceSchema = z.preprocess(
  (value: unknown) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  z.enum(COMPANY_INTEL_SOURCES),
);

/**
 * Safe character set for non-domain keys (e.g. slugs or IDs).
 * Allows letters, digits, dashes, underscores and dots.
 */
const SAFE_KEY_REGEX: RegExp = /^[a-z0-9._-]+$/i;

/**
 * Maximum allowed length for non-domain keys to prevent abuse.
 */
const MAX_NON_DOMAIN_KEY_LENGTH = 160;

/**
 * Maximum allowed length for domain hosts (RFC-style upper bound).
 */
const MAX_DOMAIN_LENGTH = 253;

/**
 * Validates a single DNS label.
 */
const DNS_LABEL_REGEX: RegExp = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;

/**
 * Removes protocol, path, port and leading "www." from a host-like string.
 *
 * @param raw - Raw host input from the query string.
 * @returns Normalized host string in lower case.
 */
function normalizeDomainHost(raw: string): string {
  const trimmed: string = raw.trim().toLowerCase();

  // Strip protocol prefix if present.
  const withoutProtocol: string = trimmed.replace(/^[a-z]+:\/\//, "");

  // Discard any path/query fragments after the first slash.
  const hostWithPort: string = withoutProtocol.split("/")[0] ?? "";

  // Remove ports if present (e.g. example.com:3000 -> example.com).
  const hostWithoutPort: string = hostWithPort.split(":")[0] ?? "";

  // Drop common "www." prefix to avoid duplicate keys.
  const withoutWww: string = hostWithoutPort.replace(/^www\./, "");

  // Trim a trailing dot (example.com. -> example.com).
  return withoutWww.replace(/\.$/, "");
}

/**
 * Returns true when a host string is a syntactically valid domain.
 *
 * @param host - Normalized host string.
 * @returns True if the host is a valid domain, false otherwise.
 */
function isValidDomain(host: string): boolean {
  if (host.length === 0 || host.length > MAX_DOMAIN_LENGTH) {
    return false;
  }

  // Explicitly reject IP addresses; this endpoint is domain-based only.
  if (net.isIP(host) !== 0) {
    return false;
  }

  const parts: string[] = host.split(".");

  if (parts.length < 2) {
    return false;
  }

  return parts.every((part: string): boolean => DNS_LABEL_REGEX.test(part));
}

/**
 * Validates and normalizes the "key" query parameter for non-domain sources.
 */
const nonDomainKeySchema = z
  .string()
  .trim()
  .min(1, { message: "key is required" })
  .max(MAX_NON_DOMAIN_KEY_LENGTH, {
    message: "key is too long",
  })
  .regex(SAFE_KEY_REGEX, {
    message: "key contains invalid characters",
  })
  .transform((value: string): string => value.toLowerCase());

/**
 * Validates and normalizes the "key" query parameter for domain lookups.
 */
const domainKeySchema = z
  .string()
  .trim()
  .min(1, { message: "key is required" })
  .max(MAX_DOMAIN_LENGTH, { message: "key is too long" })
  .transform(normalizeDomainHost)
  .refine(isValidDomain, { message: "Invalid domain" });

/**
 * Full request schema for GET /api/public/company-intel query parameters.
 * Uses a discriminated union to apply source-specific key validation.
 */
export const companyIntelRequestSchema = z
  .object({
    source: normalizedSourceSchema,
    key: z.string(),
  })
  .pipe(
    z.discriminatedUnion("source", [
      z.object({
        source: z.literal("domain"),
        key: domainKeySchema,
      }),
      z.object({
        source: z.enum([
          "linkedin",
          "glassdoor",
          "indeed",
          "workable",
        ]),
        key: nonDomainKeySchema,
      }),
    ]),
  );

export type CompanyIntelRequest = z.infer<typeof companyIntelRequestSchema>;

/**
 * Confidence levels for the aggregated signals.
 */
export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type ConfidenceLevel = z.infer<typeof confidenceSchema>;

/**
 * Schema describing the signals block returned by the endpoint.
 */
export const companyIntelSignalsSchema = z.object({
  reportCountTotal: z.number().int().nonnegative(),
  reportCount90d: z.number().int().nonnegative(),
  riskScore: z.number().min(0).max(1).nullable(),
  confidence: confidenceSchema,
});

/**
 * Success payload schema for the endpoint.
 */
export const companyIntelOkResponseSchema = z.object({
  company: z.object({
    canonicalId: z.string(),
    displayName: z.string().trim().min(1).optional(),
  }),
  signals: companyIntelSignalsSchema,
  updatedAt: z.string().datetime(),
});

/**
 * Insufficient-data payload schema.
 */
export const companyIntelInsufficientResponseSchema = z.object({
  status: z.literal("insufficient_data"),
});

/**
 * Error payload schema for client-visible failures.
 */
export const companyIntelErrorResponseSchema = z.object({
  error: z.string().trim().min(1),
});

/**
 * Union of all valid response bodies for GET /api/public/company-intel.
 */
export const companyIntelResponseSchema = z.union([
  companyIntelOkResponseSchema,
  companyIntelInsufficientResponseSchema,
  companyIntelErrorResponseSchema,
]);
