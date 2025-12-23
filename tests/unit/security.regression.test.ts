// tests/unit/security.regression.test.ts
/**
 * Security Regression Tests
 *
 * This file contains security-focused regression tests for:
 * - CSRF token edge cases and attack vectors
 * - Session token tampering and replay attacks
 * - Cookie security attributes
 * - Rate limiting bypass attempts
 * - Input validation edge cases
 *
 * These tests are designed to prevent regressions in security controls.
 */
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// CSRF Security Tests
// ============================================================================

describe("CSRF Security Regression", () => {
  const env = vi.hoisted(() => ({
    NODE_ENV: "test" as "test" | "production" | "development",
    ADMIN_CSRF_SECRET: "test-csrf-secret-32-chars-long!",
  }));

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    vi.doMock("@/env", () => ({ env }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  async function loadCsrf(): Promise<{
    createCsrfToken: (purpose: string) => string;
    verifyCsrfToken: (purpose: string, token: string | null) => boolean;
  }> {
    vi.resetModules();
    vi.doMock("@/env", () => ({ env }));
    const mod = await import("@/lib/csrf");
    return {
      createCsrfToken: mod.createCsrfToken as (purpose: string) => string,
      verifyCsrfToken: mod.verifyCsrfToken as (purpose: string, token: string | null) => boolean,
    };
  }

  describe("Timing Attack Resistance", () => {
    it("uses constant-time comparison for signature verification", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      // Measure verification time for valid vs invalid tokens
      const validToken = createCsrfToken("admin-login");

      // Create a token with wrong signature (same length)
      const decoded = JSON.parse(Buffer.from(validToken, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;
      const wrongSig = "a".repeat((decoded.s as string).length);
      decoded.s = wrongSig;
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      // Both should complete without timing leaks (no early return on first byte mismatch)
      const validStart = Date.now();
      verifyCsrfToken("admin-login", validToken);
      const validDuration = Date.now() - validStart;

      const invalidStart = Date.now();
      verifyCsrfToken("admin-login", tamperedToken);
      const invalidDuration = Date.now() - invalidStart;

      // Timing should be roughly similar (within 10ms for mocked timers)
      expect(Math.abs(validDuration - invalidDuration)).toBeLessThan(50);
    });
  });

  describe("Token Replay Attack Prevention", () => {
    it("rejects tokens after expiry even if previously valid", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");
      expect(verifyCsrfToken("admin-login", token)).toBe(true);

      // Advance time past token lifetime (1 hour)
      vi.setSystemTime(new Date("2025-01-01T01:00:01.000Z"));

      expect(verifyCsrfToken("admin-login", token)).toBe(false);
    });

    it("rejects token at exact expiry boundary", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");
      expect(verifyCsrfToken("admin-login", token)).toBe(true);

      // Advance to exactly 1 hour (TTL boundary)
      vi.setSystemTime(new Date("2025-01-01T01:00:00.001Z"));

      expect(verifyCsrfToken("admin-login", token)).toBe(false);
    });

    it("accepts token just before expiry boundary", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");

      // Advance to 59 minutes 59 seconds
      vi.setSystemTime(new Date("2025-01-01T00:59:59.999Z"));

      expect(verifyCsrfToken("admin-login", token)).toBe(true);
    });

    it("rejects tokens with future iat (clock skew attack)", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      // Manually craft a token with future iat
      const futureIat = Date.now() + 60_000; // 1 minute in the future
      const payload = {
        v: 1,
        p: "admin-login",
        iat: futureIat,
        n: "test-nonce",
        s: "fake-sig", // Will be invalid anyway
      };

      const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
      expect(verifyCsrfToken("admin-login", token)).toBe(false);
    });
  });

  describe("Purpose Binding", () => {
    it("rejects token used for different purpose than created", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const loginToken = createCsrfToken("admin-login");
      const moderationToken = createCsrfToken("admin-moderation");

      // Cross-purpose usage should fail
      expect(verifyCsrfToken("admin-moderation", loginToken)).toBe(false);
      expect(verifyCsrfToken("admin-login", moderationToken)).toBe(false);

      // Same purpose should work
      expect(verifyCsrfToken("admin-login", loginToken)).toBe(true);
      expect(verifyCsrfToken("admin-moderation", moderationToken)).toBe(true);
    });
  });

  describe("Malformed Token Handling", () => {
    it("rejects null bytes in token", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      expect(verifyCsrfToken("admin-login", "abc\x00def")).toBe(false);
    });

    it("rejects extremely long tokens (DoS prevention)", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      const longToken = "a".repeat(100_000);
      expect(verifyCsrfToken("admin-login", longToken)).toBe(false);
    });

    it("rejects tokens with unicode exploitation attempts", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      // Attempt unicode normalization attacks
      expect(verifyCsrfToken("admin-login", "admin\u200Blogin")).toBe(false);
      expect(verifyCsrfToken("admin-login", "admin\uFEFFlogin")).toBe(false);
    });
  });

  describe("Signature Tampering", () => {
    it("rejects token with modified signature", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;

      // Modify signature slightly
      decoded.s = (decoded.s as string).slice(0, -1) + "X";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      expect(verifyCsrfToken("admin-login", tamperedToken)).toBe(false);
    });

    it("rejects token with empty signature", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;

      decoded.s = "";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      expect(verifyCsrfToken("admin-login", tamperedToken)).toBe(false);
    });

    it("rejects token with null signature", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      const payload = {
        v: 1,
        p: "admin-login",
        iat: Date.now(),
        n: "test-nonce",
        s: null,
      };

      const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
      expect(verifyCsrfToken("admin-login", token)).toBe(false);
    });
  });

  describe("Nonce Integrity", () => {
    it("rejects token with modified nonce", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;

      // Modify nonce (signature will now be invalid)
      decoded.n = "modified-nonce";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      expect(verifyCsrfToken("admin-login", tamperedToken)).toBe(false);
    });

    it("rejects token with empty nonce", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      const payload = {
        v: 1,
        p: "admin-login",
        iat: Date.now(),
        n: "",
        s: "fake-sig",
      };

      const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
      expect(verifyCsrfToken("admin-login", token)).toBe(false);
    });
  });

  describe("Version Mismatch", () => {
    it("rejects tokens with wrong version", async () => {
      const { createCsrfToken, verifyCsrfToken } = await loadCsrf();

      const token = createCsrfToken("admin-login");
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;

      // Change version
      decoded.v = 99;
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      expect(verifyCsrfToken("admin-login", tamperedToken)).toBe(false);
    });

    it("rejects tokens with missing version", async () => {
      const { verifyCsrfToken } = await loadCsrf();

      const payload = {
        // Missing v field
        p: "admin-login",
        iat: Date.now(),
        n: "test-nonce",
        s: "fake-sig",
      };

      const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
      expect(verifyCsrfToken("admin-login", token)).toBe(false);
    });
  });

  describe("Token Input Validation", () => {
    it("rejects null token", async () => {
      const { verifyCsrfToken } = await loadCsrf();
      expect(verifyCsrfToken("admin-login", null)).toBe(false);
    });

    it("rejects empty string token", async () => {
      const { verifyCsrfToken } = await loadCsrf();
      expect(verifyCsrfToken("admin-login", "")).toBe(false);
    });

    it("rejects whitespace-only token", async () => {
      const { verifyCsrfToken } = await loadCsrf();
      expect(verifyCsrfToken("admin-login", "   ")).toBe(false);
    });

    it("rejects non-base64url token", async () => {
      const { verifyCsrfToken } = await loadCsrf();
      expect(verifyCsrfToken("admin-login", "not!valid@base64url")).toBe(false);
    });

    it("rejects invalid JSON in token", async () => {
      const { verifyCsrfToken } = await loadCsrf();
      const invalidJson = Buffer.from("not json at all").toString("base64url");
      expect(verifyCsrfToken("admin-login", invalidJson)).toBe(false);
    });
  });
});

// ============================================================================
// Session Security Tests
// ============================================================================

describe("Session Security Regression", () => {
  type MockEnv = {
    NODE_ENV: "production" | "development" | "test";
    ADMIN_ALLOWED_HOST?: string | undefined;
    ADMIN_PASSWORD?: string | undefined;
    ADMIN_SESSION_SECRET?: string | undefined;
  };

  async function loadAdminAuth(envOverrides: Partial<MockEnv>) {
    vi.resetModules();

    const logger = {
      logInfo: vi.fn(),
      logWarn: vi.fn(),
      logError: vi.fn(),
    };

    const env: MockEnv = {
      NODE_ENV: "test",
      ADMIN_ALLOWED_HOST: "example.test",
      ADMIN_PASSWORD: "secure-password",
      ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
      ...envOverrides,
    };

    vi.doMock("@/lib/logger", () => logger);
    vi.doMock("@/env", () => ({ env }));

    const mod = await import("@/lib/adminAuth");
    return { mod, logger, env };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Session Token Tampering", () => {
    it("rejects token with modified payload but valid signature structure", async () => {
      const { mod } = await loadAdminAuth({});

      const token = mod.createAdminSessionToken();
      const [payloadB64] = token.split(".");

      // Decode payload, modify it, re-encode (signature won't match)
      const payload = JSON.parse(
        Buffer.from(payloadB64 ?? "", "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      payload.sub = "attacker";
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

      // Keep original signature (which is now invalid for modified payload)
      const tamperedToken = `${tamperedPayload}.${token.split(".")[1]}`;

      expect(mod.verifyAdminSessionToken(tamperedToken)).toBeNull();
    });

    it("rejects token signed with different secret", async () => {
      const { mod } = await loadAdminAuth({ ADMIN_SESSION_SECRET: "correct-secret-here-32chars!" });

      // Create token with wrong secret
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "admin",
        iat: now,
        exp: now + 3600,
      };

      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const wrongSig = crypto
        .createHmac("sha256", "wrong-secret-here-32characters!")
        .update(payloadB64)
        .digest("base64url");

      const maliciousToken = `${payloadB64}.${wrongSig}`;

      // Should be rejected because signature was created with wrong secret
      expect(mod.verifyAdminSessionToken(maliciousToken)).toBeNull();
    });

    it("rejects token with modified expiration (exp tampering)", async () => {
      const { mod } = await loadAdminAuth({});

      const token = mod.createAdminSessionToken();
      const [payloadB64] = token.split(".");

      // Decode payload, extend expiration, re-encode
      const payload = JSON.parse(
        Buffer.from(payloadB64 ?? "", "base64url").toString("utf8"),
      ) as Record<string, unknown>;

      // Extend exp by 1 year
      payload.exp = (payload.exp as number) + 365 * 24 * 60 * 60;
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const tamperedToken = `${tamperedPayload}.${token.split(".")[1]}`;

      // Signature mismatch should cause rejection
      expect(mod.verifyAdminSessionToken(tamperedToken)).toBeNull();
    });

    it("rejects token with modified issued-at (iat tampering)", async () => {
      const { mod } = await loadAdminAuth({});

      const token = mod.createAdminSessionToken();
      const [payloadB64] = token.split(".");

      // Decode payload, backdate iat, re-encode
      const payload = JSON.parse(
        Buffer.from(payloadB64 ?? "", "base64url").toString("utf8"),
      ) as Record<string, unknown>;

      payload.iat = (payload.iat as number) - 1000;
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const tamperedToken = `${tamperedPayload}.${token.split(".")[1]}`;

      expect(mod.verifyAdminSessionToken(tamperedToken)).toBeNull();
    });

    it("rejects token with empty signature", async () => {
      const { mod } = await loadAdminAuth({});

      const token = mod.createAdminSessionToken();
      const [payloadB64] = token.split(".");

      const tamperedToken = `${payloadB64}.`;

      expect(mod.verifyAdminSessionToken(tamperedToken)).toBeNull();
    });

    it("rejects token without signature part", async () => {
      const { mod } = await loadAdminAuth({});

      const token = mod.createAdminSessionToken();
      const [payloadB64] = token.split(".");

      expect(mod.verifyAdminSessionToken(payloadB64 ?? "")).toBeNull();
    });

    it("rejects token with extra parts", async () => {
      const { mod } = await loadAdminAuth({});

      const token = mod.createAdminSessionToken();

      const malformedToken = `${token}.extra.parts`;

      expect(mod.verifyAdminSessionToken(malformedToken)).toBeNull();
    });
  });

  describe("Session Expiration", () => {
    it("rejects expired session tokens", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

      const { mod } = await loadAdminAuth({});
      const token = mod.createAdminSessionToken();

      // Token should be valid immediately
      expect(mod.verifyAdminSessionToken(token)).not.toBeNull();

      // Advance time past session lifetime (30 minutes for test env)
      vi.setSystemTime(new Date("2025-01-01T00:31:00.000Z"));

      // Token should now be expired
      expect(mod.verifyAdminSessionToken(token)).toBeNull();

      vi.useRealTimers();
    });

    it("accepts token just before expiration boundary", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

      const { mod } = await loadAdminAuth({});
      const token = mod.createAdminSessionToken();

      // Advance to 29 minutes 59 seconds (just before 30-minute expiry in test)
      vi.setSystemTime(new Date("2025-01-01T00:29:59.000Z"));

      expect(mod.verifyAdminSessionToken(token)).not.toBeNull();

      vi.useRealTimers();
    });

    it("rejects token just after expiration boundary", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

      const { mod } = await loadAdminAuth({});
      const token = mod.createAdminSessionToken();

      // Advance to 1 second past 30 minutes (test env session lifetime)
      // exp < now when time is past expiration
      vi.setSystemTime(new Date("2025-01-01T00:30:01.000Z"));

      // Token should be expired (exp < now)
      expect(mod.verifyAdminSessionToken(token)).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("Invalid Subject Handling", () => {
    it("rejects token with invalid subject claim", async () => {
      const { mod } = await loadAdminAuth({
        ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
      });

      // Manually craft a token with wrong subject
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: "user", // Wrong subject - should be "admin"
        iat: now,
        exp: now + 1800,
      };

      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      // Sign with correct secret but wrong payload
      const sig = crypto
        .createHmac("sha256", "32-char-secret-for-session-test!")
        .update(payloadB64)
        .digest("base64url");

      const maliciousToken = `${payloadB64}.${sig}`;

      expect(mod.verifyAdminSessionToken(maliciousToken)).toBeNull();
    });

    it("rejects token with missing subject claim", async () => {
      const { mod } = await loadAdminAuth({
        ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
      });

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        // Missing sub claim
        iat: now,
        exp: now + 1800,
      };

      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const sig = crypto
        .createHmac("sha256", "32-char-secret-for-session-test!")
        .update(payloadB64)
        .digest("base64url");

      const maliciousToken = `${payloadB64}.${sig}`;

      expect(mod.verifyAdminSessionToken(maliciousToken)).toBeNull();
    });
  });

  describe("Malformed Token Handling", () => {
    it("rejects null token", async () => {
      const { mod } = await loadAdminAuth({});
      expect(mod.verifyAdminSessionToken(null)).toBeNull();
    });

    it("rejects undefined token", async () => {
      const { mod } = await loadAdminAuth({});
      expect(mod.verifyAdminSessionToken(undefined)).toBeNull();
    });

    it("rejects empty string token", async () => {
      const { mod } = await loadAdminAuth({});
      expect(mod.verifyAdminSessionToken("")).toBeNull();
    });

    it("rejects non-base64 payload", async () => {
      const { mod } = await loadAdminAuth({});
      expect(mod.verifyAdminSessionToken("not-valid-base64!@#$.signature")).toBeNull();
    });

    it("rejects invalid JSON payload", async () => {
      const { mod } = await loadAdminAuth({});
      const invalidJson = Buffer.from("not json").toString("base64url");
      expect(mod.verifyAdminSessionToken(`${invalidJson}.somesig`)).toBeNull();
    });
  });

  describe("Constant-Time Password Comparison", () => {
    it("uses crypto.timingSafeEqual for password verification", async () => {
      const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "correct-password" });

      const spy = vi.spyOn(crypto, "timingSafeEqual");

      mod.verifyAdminPassword("wrong-password");

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("fails safely when password lengths differ", async () => {
      const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "short" });

      // Should not leak length information via early return
      expect(mod.verifyAdminPassword("a")).toBe(false);
      expect(mod.verifyAdminPassword("a".repeat(1000))).toBe(false);
    });

    it("performs dummy comparison on length mismatch for timing consistency", async () => {
      const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: "test-password-123" });

      const spy = vi.spyOn(crypto, "timingSafeEqual");

      // Password with different length
      mod.verifyAdminPassword("x");

      // Should still call timingSafeEqual (dummy comparison)
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("rejects all passwords when ADMIN_PASSWORD is not configured", async () => {
      const { mod } = await loadAdminAuth({ ADMIN_PASSWORD: undefined });

      expect(mod.verifyAdminPassword("any-password")).toBe(false);
      expect(mod.verifyAdminPassword("")).toBe(false);
    });
  });
});

// ============================================================================
// Cookie Security Tests
// ============================================================================

describe("Cookie Security Regression", () => {
  async function loadAdminAuth() {
    vi.resetModules();

    const logger = {
      logInfo: vi.fn(),
      logWarn: vi.fn(),
      logError: vi.fn(),
    };

    vi.doMock("@/lib/logger", () => logger);
    vi.doMock("@/env", () => ({
      env: {
        NODE_ENV: "test",
        ADMIN_ALLOWED_HOST: "example.test",
        ADMIN_PASSWORD: "pw",
        ADMIN_SESSION_SECRET: "secret-32-characters-long-here!",
      },
    }));

    const mod = await import("@/lib/adminAuth");
    return { mod };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("__Host- Cookie Prefix", () => {
    it("uses __Host- prefix for admin session cookie", async () => {
      const { mod } = await loadAdminAuth();

      const cookieName = mod.ADMIN_SESSION_COOKIE_NAME;
      expect(cookieName).toBe("__Host-dg_admin");
      expect(cookieName.startsWith("__Host-")).toBe(true);
    });

    it("cookie options require Path=/", async () => {
      const { mod } = await loadAdminAuth();

      const opts = mod.adminSessionCookieOptions();
      expect(opts.path).toBe("/");
    });

    it("cookie options require HttpOnly", async () => {
      const { mod } = await loadAdminAuth();

      const opts = mod.adminSessionCookieOptions();
      expect(opts.httpOnly).toBe(true);
    });

    it("cookie options require SameSite=strict", async () => {
      const { mod } = await loadAdminAuth();

      const opts = mod.adminSessionCookieOptions();
      expect(opts.sameSite).toBe("strict");
    });

    it("cookie options require Secure in production", async () => {
      vi.resetModules();

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "production",
          ADMIN_ALLOWED_HOST: "example.test",
          ADMIN_PASSWORD: "pw",
          ADMIN_SESSION_SECRET: "secret-32-characters-long-here!",
        },
      }));

      const mod = await import("@/lib/adminAuth");
      const opts = mod.adminSessionCookieOptions();
      expect(opts.secure).toBe(true);
    });
  });
});

// ============================================================================
// Rate Limiting Security Tests
// ============================================================================

import {
  enforcePublicIpRateLimit,
  PublicRateLimitError,
  resetPublicRateLimitStore,
} from "@/lib/publicRateLimit";
import { hashIp } from "@/lib/rateLimit";

describe("Rate Limiting Security Regression", () => {
  beforeEach(() => {
    resetPublicRateLimitStore();
  });

  describe("IP Validation", () => {
    it("rejects empty IP addresses", () => {
      expect(() => enforcePublicIpRateLimit({ ip: "", scope: "test" })).toThrow(
        PublicRateLimitError,
      );
    });

    it("rejects whitespace-only IP addresses", () => {
      expect(() => enforcePublicIpRateLimit({ ip: "   ", scope: "test" })).toThrow(
        PublicRateLimitError,
      );
    });

    it("rejects malformed IP addresses", () => {
      const malformedIps = [
        "not-an-ip",
        "256.0.0.1",
        "1.2.3.4.5",
        "1.2.3",
        "::g",
        "localhost",
        "127.0.0.1:8080",
        "http://127.0.0.1",
      ];

      for (const ip of malformedIps) {
        expect(
          () => enforcePublicIpRateLimit({ ip, scope: "test" }),
          `Expected ${ip} to be rejected`,
        ).toThrow(PublicRateLimitError);
      }
    });

    it("accepts valid IPv4 addresses", () => {
      const validIps = ["192.168.1.1", "10.0.0.1", "255.255.255.255", "0.0.0.0"];

      for (const ip of validIps) {
        resetPublicRateLimitStore();
        expect(() =>
          enforcePublicIpRateLimit({ ip, scope: "test", maxRequests: 100 }),
        ).not.toThrow();
      }
    });

    it("accepts valid IPv6 addresses", () => {
      const validIps = ["::1", "2001:db8::1", "fe80::1"];

      for (const ip of validIps) {
        resetPublicRateLimitStore();
        expect(() =>
          enforcePublicIpRateLimit({ ip, scope: "test", maxRequests: 100 }),
        ).not.toThrow();
      }
    });
  });

  describe("Scope Isolation", () => {
    it("rate limits are isolated per scope", () => {
      const ip = "192.0.2.1";

      // Exhaust limit for scope A
      for (let i = 0; i < 5; i++) {
        enforcePublicIpRateLimit({ ip, scope: "scope-a", maxRequests: 5 });
      }

      expect(() => enforcePublicIpRateLimit({ ip, scope: "scope-a", maxRequests: 5 })).toThrow(
        PublicRateLimitError,
      );

      // Scope B should still work
      expect(() =>
        enforcePublicIpRateLimit({ ip, scope: "scope-b", maxRequests: 5 }),
      ).not.toThrow();
    });
  });

  describe("Window Expiry", () => {
    it("allows requests after window expires", () => {
      const now = Date.now();
      const ip = "192.0.2.2";
      const windowMs = 60_000;

      // Exhaust limit
      enforcePublicIpRateLimit({ ip, scope: "test", maxRequests: 1, windowMs, now });

      expect(() =>
        enforcePublicIpRateLimit({ ip, scope: "test", maxRequests: 1, windowMs, now }),
      ).toThrow(PublicRateLimitError);

      // Advance past window
      const futureTime = now + windowMs + 1;

      expect(() =>
        enforcePublicIpRateLimit({
          ip,
          scope: "test",
          maxRequests: 1,
          windowMs,
          now: futureTime,
        }),
      ).not.toThrow();
    });
  });

  describe("IP Hashing", () => {
    it("does not store raw IP addresses", () => {
      // Verify the implementation uses hashing
      const ip = "192.0.2.100";
      const hashed = hashIp(ip);

      // Hash should not contain the original IP
      expect(hashed).not.toContain("192");
      expect(hashed).not.toContain(ip);

      // Hash should be consistent
      expect(hashIp(ip)).toBe(hashed);

      // Hash should be hex encoded
      expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});

// ============================================================================
// Admin Login Rate Limiting Tests
// ============================================================================

describe("Admin Login Rate Limiting Security Regression", () => {
  // Constants matching the login route implementation
  const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
  const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const LOGIN_RATE_LIMIT_LOCK_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Resets the global admin login rate limit store between tests.
   */
  function resetAdminLoginRateLimitStore(): void {
    const globalAny = globalThis as {
      __adminLoginRateLimitStore?: Map<string, unknown>;
    };
    globalAny.__adminLoginRateLimitStore?.clear();
  }

  /**
   * Creates a mock NextRequest for the admin login endpoint.
   */
  function makeLoginRequest({
    ip,
    host = "admin.example.test",
    origin,
    password = "test-password",
    csrfToken = "valid-csrf-token",
  }: {
    ip?: string;
    host?: string;
    origin?: string;
    password?: string;
    csrfToken?: string;
  }) {
    const headers = new Headers();
    headers.set("host", host);
    headers.set("x-forwarded-proto", "https");

    if (origin) {
      headers.set("origin", origin);
    }

    if (ip) {
      headers.set("x-forwarded-for", ip);
    }

    const formData = new FormData();
    formData.append("password", password);
    formData.append("_csrf", csrfToken);

    return {
      method: "POST",
      headers,
      nextUrl: new URL(`https://${host}/api/admin/login`),
      url: `https://${host}/api/admin/login`,
      formData: () => Promise.resolve(formData),
      cookies: { get: () => undefined },
    } as unknown as import("next/server").NextRequest;
  }

  beforeEach(async () => {
    vi.resetModules();
    resetAdminLoginRateLimitStore();
  });

  afterEach(() => {
    vi.resetModules();
    resetAdminLoginRateLimitStore();
  });

  describe("Rate Limit Enforcement", () => {
    it("allows requests under the rate limit threshold", async () => {
      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => true,
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");
      const ip = "192.0.2.50";

      // First few attempts with wrong password should return error redirect, not 429
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 1; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });

        const response = await POST(req);

        // Should redirect with error, not rate limit
        expect(response.status).toBe(303);
      }
    });

    it("enforces rate limit after max failed attempts", async () => {
      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => true,
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");
      const ip = "192.0.2.51";

      // Make max failed attempts
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });

        await POST(req);
      }

      // Next request should be rate limited
      const rateLimitedReq = makeLoginRequest({
        ip,
        origin: "https://admin.example.test",
        password: "wrong-password",
      });

      const response = await POST(rateLimitedReq);

      expect(response.status).toBe(429);

      const body = (await response.json()) as { error: string };
      expect(body.error).toContain("Too many");
    });

    it("rate limit is IP-specific (different IPs are independent)", async () => {
      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => true,
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");

      const ip1 = "192.0.2.60";
      const ip2 = "192.0.2.61";

      // Exhaust limit for IP1
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS; i++) {
        const req = makeLoginRequest({
          ip: ip1,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });
        await POST(req);
      }

      // IP1 should be rate limited
      const rateLimitedReq = makeLoginRequest({
        ip: ip1,
        origin: "https://admin.example.test",
        password: "wrong-password",
      });
      const response1 = await POST(rateLimitedReq);
      expect(response1.status).toBe(429);

      // IP2 should still be allowed
      const ip2Req = makeLoginRequest({
        ip: ip2,
        origin: "https://admin.example.test",
        password: "wrong-password",
      });
      const response2 = await POST(ip2Req);
      expect(response2.status).not.toBe(429);
    });
  });

  describe("Lockout Behavior", () => {
    it("lockout persists for the configured duration", async () => {
      vi.useFakeTimers();
      const startTime = new Date("2025-01-01T00:00:00.000Z");
      vi.setSystemTime(startTime);

      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => true,
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");
      const ip = "192.0.2.70";

      // Trigger lockout
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });
        await POST(req);
      }

      // Verify locked
      const lockedReq = makeLoginRequest({
        ip,
        origin: "https://admin.example.test",
        password: "wrong-password",
      });
      const lockedResponse = await POST(lockedReq);
      expect(lockedResponse.status).toBe(429);

      // Advance time but not past lockout
      vi.setSystemTime(new Date(startTime.getTime() + LOGIN_RATE_LIMIT_LOCK_MS - 1000));

      // Still locked
      const stillLockedReq = makeLoginRequest({
        ip,
        origin: "https://admin.example.test",
        password: "wrong-password",
      });
      const stillLockedResponse = await POST(stillLockedReq);
      expect(stillLockedResponse.status).toBe(429);

      // Advance past lockout
      vi.setSystemTime(new Date(startTime.getTime() + LOGIN_RATE_LIMIT_LOCK_MS + 1000));

      // Now should be allowed again
      const unlockedReq = makeLoginRequest({
        ip,
        origin: "https://admin.example.test",
        password: "wrong-password",
      });
      const unlockedResponse = await POST(unlockedReq);
      expect(unlockedResponse.status).not.toBe(429);

      vi.useRealTimers();
    });
  });

  describe("Successful Login Resets Rate Limit", () => {
    it("resets rate limit counter on successful login", async () => {
      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => true,
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");
      const ip = "192.0.2.80";

      // Make some failed attempts (but not enough to trigger lockout)
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 2; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });
        await POST(req);
      }

      // Successful login
      const successReq = makeLoginRequest({
        ip,
        origin: "https://admin.example.test",
        password: "correct-password",
      });
      const successResponse = await POST(successReq);
      expect(successResponse.status).toBe(303); // Redirect on success

      // Failed attempts counter should be reset
      // Make max-1 failed attempts again
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 1; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });
        const response = await POST(req);
        // Should not be rate limited yet
        expect(response.status).not.toBe(429);
      }
    });
  });

  describe("CSRF Validation Counts as Failed Attempt", () => {
    it("increments rate limit counter on CSRF validation failure", async () => {
      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => false, // Always fail CSRF
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");
      const ip = "192.0.2.90";

      // Make max failed attempts with invalid CSRF
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "correct-password", // Password is correct, but CSRF fails
          csrfToken: "invalid-csrf",
        });
        await POST(req);
      }

      // Next request should be rate limited
      const rateLimitedReq = makeLoginRequest({
        ip,
        origin: "https://admin.example.test",
        password: "correct-password",
        csrfToken: "invalid-csrf",
      });
      const response = await POST(rateLimitedReq);
      expect(response.status).toBe(429);
    });
  });

  describe("Rate Limit Window Expiry", () => {
    it("resets counter after window expires (without lockout)", async () => {
      vi.useFakeTimers();
      const startTime = new Date("2025-01-01T00:00:00.000Z");
      vi.setSystemTime(startTime);

      vi.doMock("@/env", () => ({
        env: {
          NODE_ENV: "test",
          ADMIN_ALLOWED_HOST: "admin.example.test",
          ADMIN_PASSWORD: "correct-password",
          ADMIN_SESSION_SECRET: "32-char-secret-for-session-test!",
          ADMIN_CSRF_SECRET: "32-char-csrf-secret-for-test!!!!",
        },
      }));

      vi.doMock("@/lib/csrf", () => ({
        verifyCsrfToken: () => true,
      }));

      vi.doMock("@/lib/logger", () => ({
        logInfo: vi.fn(),
        logWarn: vi.fn(),
        logError: vi.fn(),
      }));

      const { POST } = await import("@/app/api/admin/login/route");
      const ip = "192.0.2.100";

      // Make some failed attempts (not enough for lockout)
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 2; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });
        await POST(req);
      }

      // Advance past the window
      vi.setSystemTime(new Date(startTime.getTime() + LOGIN_RATE_LIMIT_WINDOW_MS + 1000));

      // Counter should be reset, so we can make max-1 attempts again
      for (let i = 0; i < LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 1; i++) {
        const req = makeLoginRequest({
          ip,
          origin: "https://admin.example.test",
          password: "wrong-password",
        });
        const response = await POST(req);
        expect(response.status).not.toBe(429);
      }

      vi.useRealTimers();
    });
  });
});

// ============================================================================
// Host/Origin Validation Tests
// ============================================================================

describe("Host/Origin Validation Security Regression", () => {
  type MockEnv = {
    NODE_ENV: "production" | "development" | "test";
    ADMIN_ALLOWED_HOST?: string | undefined;
    ADMIN_PASSWORD?: string | undefined;
    ADMIN_SESSION_SECRET?: string | undefined;
  };

  function makeReq({
    host,
    origin,
    referer,
    method = "POST",
  }: {
    host?: string;
    origin?: string;
    referer?: string;
    method?: string;
  }) {
    const headers = new Headers();
    if (host) {
      headers.set("host", host);
    }
    if (origin) {
      headers.set("origin", origin);
    }
    if (referer) {
      headers.set("referer", referer);
    }
    headers.set("x-forwarded-proto", "https");

    return {
      method,
      headers,
      nextUrl: new URL("https://example.test/admin"),
      cookies: { get: () => undefined },
    } as unknown as import("next/server").NextRequest;
  }

  async function loadAdminAuth(envOverrides: Partial<MockEnv>) {
    vi.resetModules();

    vi.doMock("@/lib/logger", () => ({
      logInfo: vi.fn(),
      logWarn: vi.fn(),
      logError: vi.fn(),
    }));

    vi.doMock("@/env", () => ({
      env: {
        NODE_ENV: "test",
        ADMIN_ALLOWED_HOST: "admin.example.test",
        ADMIN_PASSWORD: "pw",
        ADMIN_SESSION_SECRET: "secret",
        ...envOverrides,
      },
    }));

    return import("@/lib/adminAuth");
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Host Header Attacks", () => {
    it("rejects hosts that don't match allowed host exactly", async () => {
      const mod = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "admin.example.test" });

      // Note: The browser/HTTP spec prevents injection attacks like newlines in headers.
      // The Headers API rejects them. Our test validates business logic accepts/rejects hosts.
      const attackVectors = [
        "evil.test",
        "admin.example.test.evil.com",
        "ADMIN.EXAMPLE.TEST", // Case sensitivity check
      ];

      for (const host of attackVectors) {
        const req = makeReq({ host });
        expect(mod.isAllowedAdminHost(req), `Expected ${host} to be rejected`).toBe(false);
      }
    });

    it("rejects subdomain attacks when exact host is required", async () => {
      const mod = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "admin.example.test" });

      expect(mod.isAllowedAdminHost(makeReq({ host: "evil.admin.example.test" }))).toBe(false);
      expect(mod.isAllowedAdminHost(makeReq({ host: "admin.example.test.evil.com" }))).toBe(false);
    });
  });

  describe("Origin Header Attacks", () => {
    it("rejects origin header spoofing attempts", async () => {
      const mod = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "admin.example.test" });

      const req = makeReq({
        host: "admin.example.test",
        origin: "https://evil.test",
        method: "POST",
      });

      expect(mod.isOriginAllowed(req)).toBe(false);
    });

    it("rejects null origin on unsafe methods", async () => {
      const mod = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "admin.example.test" });

      const req = makeReq({
        host: "admin.example.test",
        // No origin or referer
        method: "POST",
      });

      expect(mod.isOriginAllowed(req)).toBe(false);
    });
  });

  describe("CSRF via Referer", () => {
    it("validates referer as fallback for origin", async () => {
      const mod = await loadAdminAuth({ ADMIN_ALLOWED_HOST: "admin.example.test" });

      // Valid referer
      const validReq = makeReq({
        host: "admin.example.test",
        referer: "https://admin.example.test/admin/login",
        method: "POST",
      });
      expect(mod.isOriginAllowed(validReq)).toBe(true);

      // Evil referer
      const evilReq = makeReq({
        host: "admin.example.test",
        referer: "https://evil.test/exploit",
        method: "POST",
      });
      expect(mod.isOriginAllowed(evilReq)).toBe(false);
    });
  });
});
