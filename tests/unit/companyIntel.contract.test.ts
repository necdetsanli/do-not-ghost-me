// tests/unit/companyIntel.contract.test.ts
import { describe, expect, it } from "vitest";
import { companyIntelRequestSchema } from "@/lib/contracts/companyIntel";

describe("companyIntelRequestSchema", () => {
  it("normalizes source casing and lowercases non-domain keys", () => {
    const result = companyIntelRequestSchema.safeParse({
      source: "LinkedIn",
      key: "Acme-Corp_123",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.source).toBe("linkedin");
      expect(result.data.key).toBe("acme-corp_123");
    }
  });

  it("rejects unsupported sources", () => {
    const result = companyIntelRequestSchema.safeParse({
      source: "facebook",
      key: "acme",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty keys", () => {
    const result = companyIntelRequestSchema.safeParse({
      source: "linkedin",
      key: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects overly long non-domain keys", () => {
    const longKey = "a".repeat(200);

    const result = companyIntelRequestSchema.safeParse({
      source: "linkedin",
      key: longKey,
    });

    expect(result.success).toBe(false);
  });

  it("rejects keys with unsafe characters", () => {
    const result = companyIntelRequestSchema.safeParse({
      source: "glassdoor",
      key: "acme corp!",
    });

    expect(result.success).toBe(false);
  });

  it("normalizes and validates domains", () => {
    const result = companyIntelRequestSchema.safeParse({
      source: "domain",
      key: "HTTPS://www.Example.COM/path",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.key).toBe("example.com");
    }
  });

  it("rejects invalid domains and IP addresses", () => {
    const invalids = [
      { source: "domain", key: "not-a-domain" },
      { source: "domain", key: "192.168.0.1" },
      { source: "domain", key: "example..com" },
    ];

    for (const payload of invalids) {
      const result = companyIntelRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    }
  });
});
