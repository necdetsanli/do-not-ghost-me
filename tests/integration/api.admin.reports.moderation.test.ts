// tests/integration/api.admin.reports.moderation.test.ts
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_ADMIN_CSRF_SECRET,
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_SESSION_SECRET,
  TEST_RATE_LIMIT_IP_SALT,
} from "../testUtils/testSecrets";

type EnvKey =
  | "NODE_ENV"
  | "DATABASE_URL"
  | "RATE_LIMIT_IP_SALT"
  | "ADMIN_PASSWORD"
  | "ADMIN_SESSION_SECRET"
  | "ADMIN_ALLOWED_HOST"
  | "ADMIN_CSRF_SECRET";

type EnvSnapshot = Record<EnvKey, string | undefined>;
type EnvOverrides = Partial<Record<EnvKey, string>>;

function getEnvVar(key: EnvKey): string | undefined {
  const env = process.env as unknown as Record<string, string | undefined>;
  return env[key];
}

function setEnvVar(key: EnvKey, value: string | undefined): void {
  const env = process.env as unknown as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[key];
    return;
  }
  env[key] = value;
}

function snapshotEnv(): EnvSnapshot {
  return {
    NODE_ENV: getEnvVar("NODE_ENV"),
    DATABASE_URL: getEnvVar("DATABASE_URL"),
    RATE_LIMIT_IP_SALT: getEnvVar("RATE_LIMIT_IP_SALT"),
    ADMIN_PASSWORD: getEnvVar("ADMIN_PASSWORD"),
    ADMIN_SESSION_SECRET: getEnvVar("ADMIN_SESSION_SECRET"),
    ADMIN_ALLOWED_HOST: getEnvVar("ADMIN_ALLOWED_HOST"),
    ADMIN_CSRF_SECRET: getEnvVar("ADMIN_CSRF_SECRET"),
  };
}

/**
 * Applies a minimal valid env for importing the app env schema.
 *
 * Uses vi.stubEnv to avoid direct process.env assignments (read-only typing).
 *
 * @param overrides - Partial env overrides for a test.
 * @returns void
 */
function restoreEnv(snap: EnvSnapshot): void {
  setEnvVar("NODE_ENV", snap.NODE_ENV);
  setEnvVar("DATABASE_URL", snap.DATABASE_URL);
  setEnvVar("RATE_LIMIT_IP_SALT", snap.RATE_LIMIT_IP_SALT);
  setEnvVar("ADMIN_PASSWORD", snap.ADMIN_PASSWORD);
  setEnvVar("ADMIN_SESSION_SECRET", snap.ADMIN_SESSION_SECRET);
  setEnvVar("ADMIN_ALLOWED_HOST", snap.ADMIN_ALLOWED_HOST);
  setEnvVar("ADMIN_CSRF_SECRET", snap.ADMIN_CSRF_SECRET);
}

function applyBaseEnv(overrides: EnvOverrides = {}): void {
  setEnvVar("NODE_ENV", overrides.NODE_ENV ?? "test");
  setEnvVar(
    "DATABASE_URL",
    overrides.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/testdb",
  );

  setEnvVar("RATE_LIMIT_IP_SALT", overrides.RATE_LIMIT_IP_SALT ?? TEST_RATE_LIMIT_IP_SALT);
  setEnvVar("ADMIN_PASSWORD", overrides.ADMIN_PASSWORD ?? TEST_ADMIN_PASSWORD);
  setEnvVar("ADMIN_SESSION_SECRET", overrides.ADMIN_SESSION_SECRET ?? TEST_ADMIN_SESSION_SECRET);
  setEnvVar("ADMIN_CSRF_SECRET", overrides.ADMIN_CSRF_SECRET ?? TEST_ADMIN_CSRF_SECRET);

  setEnvVar("ADMIN_ALLOWED_HOST", overrides.ADMIN_ALLOWED_HOST ?? "admin.test");
}

/**
 * Encodes a form payload as application/x-www-form-urlencoded.
 *
 * @param form - Form fields.
 * @returns URLSearchParams body.
 */
function encodeForm(form: Record<string, string>): URLSearchParams {
  return new URLSearchParams(form);
}

/**
 * Builds a NextRequest for POST /api/admin/reports/[id] with headers, cookies and form.
 *
 * @param absoluteUrl - Absolute URL string.
 * @param headers - Headers to apply.
 * @param cookie - Cookie header value or null.
 * @param form - Form fields.
 * @returns NextRequest instance.
 */
function buildAdminModerationRequest(
  absoluteUrl: string,
  headers: Record<string, string>,
  cookie: string | null,
  form: Record<string, string>,
): NextRequest {
  const mergedHeaders: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    ...headers,
  };

  if (cookie !== null) {
    mergedHeaders.cookie = cookie;
  }

  return new NextRequest(absoluteUrl, {
    method: "POST",
    headers: mergedHeaders,
    body: encodeForm(form),
  });
}

/**
 * Imports adminAuth helpers after env is applied.
 *
 * @returns Admin auth helpers.
 */
async function importAdminAuthHelpers(): Promise<{
  createAdminSessionToken: () => string;
  ADMIN_SESSION_COOKIE_NAME: string;
}> {
  vi.resetModules();
  const mod = await import("@/lib/adminAuth");
  return {
    createAdminSessionToken: mod.createAdminSessionToken as () => string,
    ADMIN_SESSION_COOKIE_NAME: mod.ADMIN_SESSION_COOKIE_NAME as string,
  };
}

/**
 * Imports CSRF helpers after env is applied.
 *
 * @returns CSRF helpers.
 */
async function importCsrfHelpers(): Promise<{
  createCsrfToken: (purpose: "admin-login" | "admin-moderation") => string;
}> {
  vi.resetModules();
  const mod = await import("@/lib/csrf");
  return {
    createCsrfToken: mod.createCsrfToken as (purpose: "admin-login" | "admin-moderation") => string,
  };
}

/**
 * Creates a prisma mock and installs it for "@/lib/db".
 *
 * @returns Prisma mock object.
 */
function installPrismaMock(): {
  prisma: {
    report: {
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
} {
  const prisma = {
    report: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  vi.doMock("@/lib/db", () => {
    return { prisma };
  });

  return { prisma };
}

/**
 * Imports the moderation route handler with fresh modules and active mocks.
 *
 * @returns The imported POST handler.
 */
async function importModerationPost(): Promise<{
  POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
}> {
  vi.resetModules();
  const mod = await import("@/app/api/admin/reports/[id]/route");
  return {
    POST: mod.POST as (
      req: NextRequest,
      ctx: { params: Promise<{ id: string }> },
    ) => Promise<Response>,
  };
}

/**
 * Builds standard headers to satisfy requireAdminRequest:
 * - Host must match ADMIN_ALLOWED_HOST,
 * - Origin/Referer must match expected origin for non-safe methods.
 *
 * @param host - Host value (e.g. "admin.test").
 * @returns Headers record.
 */
function buildAllowedHeaders(host: string): Record<string, string> {
  return {
    host,
    origin: `https://${host}`,
    referer: `https://${host}/admin`,
  };
}

describe("POST /api/admin/reports/[id] moderation", () => {
  let snap: EnvSnapshot;

  beforeEach(() => {
    snap = snapshotEnv();
  });

  afterEach(() => {
    restoreEnv(snap);
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 403 JSON when ADMIN_ALLOWED_HOST mismatches Host header", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    installPrismaMock();
    const { POST } = await importModerationPost();

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r1",
      {
        host: "evil.test",
      },
      null,
      { action: "flag" },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(403);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this host.");
  });

  it("echoes the incoming correlation id header (lowercased) on responses", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    installPrismaMock();
    const { POST } = await importModerationPost();

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r1",
      {
        host: "evil.test",
        "x-correlation-id": "123E4567-E89B-42D3-A456-426614174000",
      },
      null,
      { action: "flag" },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(403);
    expect(res.headers.get("x-correlation-id")).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  describe("host/origin matrix (current behavior)", () => {
    it("allows when host matches ADMIN_ALLOWED_HOST and origin/referer match", async () => {
      applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });
      installPrismaMock();
      const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
      const { createCsrfToken } = await importCsrfHelpers();
      const { POST } = await importModerationPost();

      const headers = buildAllowedHeaders("admin.test");
      const token = createAdminSessionToken();
      const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
      const csrf = createCsrfToken("admin-moderation");

      const req = buildAdminModerationRequest(
        "https://admin.test/api/admin/reports/r1",
        headers,
        cookie,
        { action: "flag", csrf_token: csrf },
      );

      const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("denies when origin/referer do not match ADMIN_ALLOWED_HOST", async () => {
      applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });
      installPrismaMock();
      const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
      const { POST } = await importModerationPost();

      const token = createAdminSessionToken();
      const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;

      const req = buildAdminModerationRequest(
        "https://admin.test/api/admin/reports/r1",
        {
          host: "admin.test",
          origin: "https://evil.test",
          referer: "https://evil.test/admin",
        },
        cookie,
        { action: "flag" },
      );

      const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
      expect(res.status).toBe(401);
      const json = (await res.json()) as { error?: string };
      expect(json.error).toBe("Admin access is not allowed from this origin.");
    });

    it("denies when host mismatches ADMIN_ALLOWED_HOST even if origin matches", async () => {
      applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });
      installPrismaMock();
      const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
      const { POST } = await importModerationPost();

      const token = createAdminSessionToken();
      const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;

      const req = buildAdminModerationRequest(
        "https://admin.test/api/admin/reports/r1",
        {
          host: "evil.test",
          origin: "https://admin.test",
          referer: "https://admin.test/admin",
        },
        cookie,
        { action: "flag" },
      );

      const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error?: string };
      expect(json.error).toBe("Admin access is not allowed from this host.");
    });

    it("allows when ADMIN_ALLOWED_HOST is unset and host/origin match request host", async () => {
      applyBaseEnv({ ADMIN_ALLOWED_HOST: "" });
      installPrismaMock();
      const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
      const { createCsrfToken } = await importCsrfHelpers();
      const { POST } = await importModerationPost();

      const token = createAdminSessionToken();
      const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
      const csrf = createCsrfToken("admin-moderation");

      const req = buildAdminModerationRequest(
        "https://example.test/api/admin/reports/r1",
        {
          host: "example.test",
          origin: "https://example.test",
          referer: "https://example.test/admin",
        },
        cookie,
        { action: "flag", csrf_token: csrf },
      );

      const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  it("returns 401 JSON when Origin/Referer mismatch for POST", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    installPrismaMock();
    const { POST } = await importModerationPost();

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r1",
      {
        host: "admin.test",
        origin: "https://evil.example",
        referer: "https://evil.example/admin",
      },
      null,
      { action: "flag" },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Admin access is not allowed from this origin.");
  });

  it("returns 401 JSON when session cookie is missing", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    installPrismaMock();
    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r1",
      headers,
      null,
      { action: "flag" },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Missing or invalid admin session.");
  });

  it("returns 400 JSON when params id is empty/invalid", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/ignored",
      headers,
      cookie,
      { action: "flag" },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "   " }) });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Missing or invalid report id");
  });

  it("returns 400 JSON for unknown moderation action", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r1",
      headers,
      cookie,
      { action: "nope", csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Unknown moderation action: nope");
  });

  it("flags with reason normalized (trimmed and maxLen=255) and redirects 303", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    const longReason = `   ${"x".repeat(400)}   `;
    const expectedReason = "x".repeat(255);

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r1",
      headers,
      cookie,
      { action: "flag", reason: longReason, csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(303);

    const location = res.headers.get("location");
    expect(location).toBe("https://admin.test/admin");

    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    const call = prisma.report.update.mock.calls[0]?.[0] as
      | {
          where?: { id?: string };
          data?: {
            status?: string;
            flaggedReason?: string | null;
            flaggedAt?: Date;
          };
        }
      | undefined;

    expect(call?.where?.id).toBe("r1");
    expect(call?.data?.status).toBe("FLAGGED");
    expect(call?.data?.flaggedReason).toBe(expectedReason);
    expect(call?.data?.flaggedAt instanceof Date).toBe(true);
  });

  it("restore clears flagged/deleted metadata and redirects 303", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r2",
      headers,
      cookie,
      { action: "restore", csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r2" }) });
    expect(res.status).toBe(303);

    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    const call = prisma.report.update.mock.calls[0]?.[0] as
      | {
          where?: { id?: string };
          data?: {
            status?: string;
            flaggedAt?: null;
            flaggedReason?: null;
            deletedAt?: null;
          };
        }
      | undefined;

    expect(call?.where?.id).toBe("r2");
    expect(call?.data?.status).toBe("ACTIVE");
    expect(call?.data?.flaggedAt).toBeNull();
    expect(call?.data?.flaggedReason).toBeNull();
    expect(call?.data?.deletedAt).toBeNull();
  });

  it("soft delete sets deletedAt and status DELETED and redirects 303", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r3",
      headers,
      cookie,
      { action: "delete", csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r3" }) });
    expect(res.status).toBe(303);

    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    const call = prisma.report.update.mock.calls[0]?.[0] as
      | {
          where?: { id?: string };
          data?: { status?: string; deletedAt?: Date };
        }
      | undefined;

    expect(call?.where?.id).toBe("r3");
    expect(call?.data?.status).toBe("DELETED");
    expect(call?.data?.deletedAt instanceof Date).toBe(true);
  });

  it("hard delete calls prisma.report.delete and redirects 303", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.delete.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r4",
      headers,
      cookie,
      { action: "hard-delete", csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r4" }) });
    expect(res.status).toBe(303);

    expect(prisma.report.delete).toHaveBeenCalledTimes(1);
    const call = prisma.report.delete.mock.calls[0]?.[0] as { where?: { id?: string } } | undefined;

    expect(call?.where?.id).toBe("r4");
  });

  it("returns 500 JSON when Prisma throws an unexpected error", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockRejectedValue(new Error("db failure"));

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r5",
      headers,
      cookie,
      { action: "flag", reason: "test", csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r5" }) });
    expect(res.status).toBe(500);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Failed to apply moderation action");
  });

  it("returns 400 JSON when action is missing from form data", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    installPrismaMock();

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    // Note: no action field in form data
    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r6",
      headers,
      cookie,
      { csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r6" }) });
    expect(res.status).toBe(400);

    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("Missing moderation action");
  });

  it("trims and truncates reason field via parseReasonFromFormData (empty string → null)", async () => {
    applyBaseEnv({ ADMIN_ALLOWED_HOST: "admin.test" });

    const { prisma } = installPrismaMock();
    prisma.report.update.mockResolvedValue({});

    const { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } = await importAdminAuthHelpers();
    const { createCsrfToken } = await importCsrfHelpers();

    const { POST } = await importModerationPost();

    const headers = buildAllowedHeaders("admin.test");
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE_NAME}=${token}`;
    const csrfToken = createCsrfToken("admin-moderation");

    // Reason is whitespace only, should be trimmed to empty string → null
    const req = buildAdminModerationRequest(
      "https://admin.test/api/admin/reports/r7",
      headers,
      cookie,
      { action: "flag", reason: "   ", csrf_token: csrfToken },
    );

    const res = await POST(req, { params: Promise.resolve({ id: "r7" }) });
    expect(res.status).toBe(303);

    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    const call = prisma.report.update.mock.calls[0]?.[0] as {
      data?: { flaggedReason?: string | null };
    };
    expect(call?.data?.flaggedReason).toBeNull();
  });
});
