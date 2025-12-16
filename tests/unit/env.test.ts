// tests/unit/env.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type EnvMap = Record<string, string | undefined>;

const ORIGINAL_ENV: Record<string, string | undefined> = { ...process.env };

/**
 * Restores process.env back to its original snapshot.
 *
 * @returns void
 */
function restoreOriginalEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (Object.prototype.hasOwnProperty.call(ORIGINAL_ENV, key) === false) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

/**
 * Applies env vars: string sets, undefined deletes.
 *
 * @param vars - Key/value map to apply.
 * @returns void
 */
function applyEnv(vars: EnvMap): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

/**
 * Loads "@/env" after resetting module cache and setting process.env.
 * IMPORTANT: This module evaluates immediately on import and may throw.
 *
 * @param overrides - Env overrides; undefined deletes a key.
 * @returns The imported module.
 */
async function loadEnvModule(
  overrides: EnvMap,
): Promise<typeof import("@/env")> {
  vi.resetModules();

  const baseValid: EnvMap = {
    DATABASE_URL: "postgresql://example.test/db",
    RATE_LIMIT_IP_SALT: "a".repeat(32),
    NODE_ENV: undefined,
    RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: undefined,
    RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: undefined,
    ADMIN_PASSWORD: undefined,
    ADMIN_SESSION_SECRET: undefined,
    ADMIN_ALLOWED_HOST: undefined,
    ADMIN_CSRF_SECRET: undefined,
  };

  applyEnv({ ...baseValid, ...overrides });

  return import("@/env");
}

describe("src/env.ts", () => {
  beforeEach(() => {
    restoreOriginalEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    restoreOriginalEnv();
    vi.restoreAllMocks();
  });

  it("exports a frozen env object", async () => {
    const mod = await loadEnvModule({});
    expect(Object.isFrozen(mod.env)).toBe(true);
  });

  it("defaults NODE_ENV to 'development' when missing", async () => {
    const mod = await loadEnvModule({ NODE_ENV: undefined });
    expect(mod.env.NODE_ENV).toBe("development");
  });

  it("uses defaults for rate limit numeric configs when missing", async () => {
    const mod = await loadEnvModule({
      RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: undefined,
      RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: undefined,
    });

    expect(mod.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP).toBe(3);
    expect(mod.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY).toBe(10);
  });

  it("coerces numeric env vars from strings", async () => {
    const mod = await loadEnvModule({
      RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: "4",
      RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: "12",
    });

    expect(mod.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP).toBe(4);
    expect(mod.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY).toBe(12);
  });

  it("throws when DATABASE_URL is missing/empty", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        DATABASE_URL: "",
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("throws when RATE_LIMIT_IP_SALT is shorter than 32 chars", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        RATE_LIMIT_IP_SALT: "short-salt",
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("throws when RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP is out of range (> 5)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP: "6",
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("throws when RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY is out of range (> 20)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY: "21",
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("admin invariants: throws when ADMIN_PASSWORD is set but ADMIN_SESSION_SECRET is missing", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        ADMIN_PASSWORD: "password1",
        ADMIN_SESSION_SECRET: undefined,
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("admin invariants: throws when ADMIN_SESSION_SECRET is set but ADMIN_PASSWORD is missing", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        ADMIN_PASSWORD: undefined,
        ADMIN_SESSION_SECRET: "s".repeat(32),
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("admin invariants: throws when admin is enabled but ADMIN_CSRF_SECRET is missing", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        ADMIN_PASSWORD: "password1",
        ADMIN_SESSION_SECRET: "s".repeat(32),
        ADMIN_CSRF_SECRET: undefined,
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("admin invariants: succeeds when ADMIN_PASSWORD + ADMIN_SESSION_SECRET + ADMIN_CSRF_SECRET are set", async () => {
    const mod = await loadEnvModule({
      ADMIN_PASSWORD: "password1",
      ADMIN_SESSION_SECRET: "s".repeat(32),
      ADMIN_CSRF_SECRET: "c".repeat(32),
      ADMIN_ALLOWED_HOST: "example.test",
    });

    expect(mod.env.ADMIN_PASSWORD).toBe("password1");
    expect(mod.env.ADMIN_SESSION_SECRET).toBe("s".repeat(32));
    expect(mod.env.ADMIN_CSRF_SECRET).toBe("c".repeat(32));
    expect(mod.env.ADMIN_ALLOWED_HOST).toBe("example.test");
  });

  it("production guard: throws when salt looks like placeholder", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadEnvModule({
        NODE_ENV: "production",
        RATE_LIMIT_IP_SALT: "replace-with-a-strong-random-salt-value-123456",
      }),
    ).rejects.toThrow(
      "Invalid environment configuration. See error log above.",
    );

    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});
