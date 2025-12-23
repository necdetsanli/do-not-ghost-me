// tests/unit/securityHeaders.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the security headers configuration in next.config.ts.
 *
 * Since Next.js applies headers at the server level via the headers() function,
 * we test the configuration directly rather than making HTTP requests.
 */
describe("Security Headers Configuration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /**
   * Helper to import next.config.ts fresh after setting NODE_ENV.
   */
  async function importConfigFresh(): Promise<{
    default: {
      headers: () => Promise<
        Array<{ source: string; headers: Array<{ key: string; value: string }> }>
      >;
      poweredByHeader: boolean;
      reactStrictMode: boolean;
    };
  }> {
    vi.resetModules();
    return import("../../next.config");
  }

  describe("in development mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("includes X-Content-Type-Options: nosniff", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "X-Content-Type-Options");
      expect(header).toBeDefined();
      expect(header?.value).toBe("nosniff");
    });

    it("includes X-Frame-Options: DENY", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "X-Frame-Options");
      expect(header).toBeDefined();
      expect(header?.value).toBe("DENY");
    });

    it("includes Referrer-Policy: strict-origin-when-cross-origin", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Referrer-Policy");
      expect(header).toBeDefined();
      expect(header?.value).toBe("strict-origin-when-cross-origin");
    });

    it("includes Permissions-Policy with disabled features", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Permissions-Policy");
      expect(header).toBeDefined();
      expect(header?.value).toContain("geolocation=()");
      expect(header?.value).toContain("microphone=()");
      expect(header?.value).toContain("camera=()");
    });

    it("does NOT include HSTS in development", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Strict-Transport-Security");
      expect(header).toBeUndefined();
    });

    it("does NOT include CSP in development", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Content-Security-Policy");
      expect(header).toBeUndefined();
    });
  });

  describe("in production mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("includes X-Content-Type-Options: nosniff", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "X-Content-Type-Options");
      expect(header).toBeDefined();
      expect(header?.value).toBe("nosniff");
    });

    it("includes X-Frame-Options: DENY", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "X-Frame-Options");
      expect(header).toBeDefined();
      expect(header?.value).toBe("DENY");
    });

    it("includes Referrer-Policy: strict-origin-when-cross-origin", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Referrer-Policy");
      expect(header).toBeDefined();
      expect(header?.value).toBe("strict-origin-when-cross-origin");
    });

    it("includes Permissions-Policy with disabled features", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Permissions-Policy");
      expect(header).toBeDefined();
      expect(header?.value).toContain("geolocation=()");
      expect(header?.value).toContain("microphone=()");
      expect(header?.value).toContain("camera=()");
      expect(header?.value).toContain("interest-cohort=()");
    });

    it("includes HSTS with 1-year max-age, includeSubDomains, and preload", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Strict-Transport-Security");
      expect(header).toBeDefined();
      expect(header?.value).toContain("max-age=31536000");
      expect(header?.value).toContain("includeSubDomains");
      expect(header?.value).toContain("preload");
    });

    it("includes Content-Security-Policy with required directives", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Content-Security-Policy");
      expect(header).toBeDefined();

      const csp = header?.value ?? "";

      // Core directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).toContain("img-src 'self' data:");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("font-src 'self' data:");

      // Anti-clickjacking
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("frame-src 'none'");

      // Form security
      expect(csp).toContain("form-action 'self'");

      // Base URI restriction
      expect(csp).toContain("base-uri 'self'");

      // Disable legacy plugins
      expect(csp).toContain("object-src 'none'");
    });

    it("does NOT allow unsafe-eval in script-src", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Content-Security-Policy");
      expect(header).toBeDefined();

      const csp = header?.value ?? "";
      expect(csp).not.toContain("unsafe-eval");
    });

    it("matches the exact production CSP string (drift guard)", async () => {
      const expectedCsp =
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "object-src 'none'; " +
        "img-src 'self' data:; " +
        "connect-src 'self'; " +
        "font-src 'self' data:; " +
        "frame-ancestors 'none'; " +
        "frame-src 'none'; " +
        "form-action 'self'; " +
        "base-uri 'self'; " +
        "media-src 'self'; " +
        "manifest-src 'self'; " +
        "worker-src 'self' blob:";

      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();
      const globalHeaders = headerConfigs.find((h) => h.source === "/(.*)")?.headers ?? [];

      const header = globalHeaders.find((h) => h.key === "Content-Security-Policy");
      expect(header).toBeDefined();
      expect(header?.value).toBe(expectedCsp);
    });
  });

  describe("general config", () => {
    it("disables X-Powered-By header", async () => {
      const config = await importConfigFresh();
      expect(config.default.poweredByHeader).toBe(false);
    });

    it("enables React strict mode", async () => {
      const config = await importConfigFresh();
      expect(config.default.reactStrictMode).toBe(true);
    });

    it("applies security headers to all routes via /(.*) source", async () => {
      const config = await importConfigFresh();
      const headerConfigs = await config.default.headers();

      const globalConfig = headerConfigs.find((h) => h.source === "/(.*)");
      expect(globalConfig).toBeDefined();
      expect(globalConfig?.headers.length).toBeGreaterThan(0);
    });
  });
});
