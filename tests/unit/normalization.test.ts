import { describe, it, expect } from "vitest";
import { normalizeCompanyName } from "@/lib/normalization";

describe("lib/normalization.normalizeCompanyName", () => {
  it("trims, lowercases, and removes non letters/digits", () => {
    expect(normalizeCompanyName("  ACME   Corp ")).toBe("acmecorp");
    expect(normalizeCompanyName("Acme-Corp")).toBe("acmecorp");
    expect(normalizeCompanyName("ACME/CORP")).toBe("acmecorp");
  });

  it("normalizes Unicode using NFKC (e.g. fullwidth characters)", () => {
    expect(normalizeCompanyName("ＡＣＭＥ")).toBe("acme");
  });

  it("keeps Unicode letters and digits", () => {
    expect(normalizeCompanyName("  Çalışma 123 ")).toBe("çalışma123");
  });

  it("returns empty string when trimmed input is empty", () => {
    expect(normalizeCompanyName("   ")).toBe("");
  });

  it("returns empty string when nothing usable remains after stripping", () => {
    expect(normalizeCompanyName("!!! --- ???")).toBe("");
  });
});
