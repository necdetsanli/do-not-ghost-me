// tests/unit/correlation.test.ts
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CORRELATION_ID_HEADER,
  deriveCorrelationId,
  setCorrelationIdHeader,
} from "@/lib/correlation";
import { UUID_V4_REGEX } from "@/lib/validation/patterns";

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://example.test/api", {
    method: "GET",
    headers,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deriveCorrelationId", () => {
  it("generates a server-side UUID when header is missing", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(makeRequest());

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("accepts a valid incoming correlation id header and lowercases it", () => {
    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: VALID_UUID.toUpperCase(),
      }),
    );

    expect(id).toBe(VALID_UUID);
  });

  it("falls back to a new UUID when header is invalid", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: "not-a-uuid",
      }),
    );

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects non-v4 versions", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: "123e4567-e89b-12d3-a456-426614174000", // version 1
      }),
    );

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects wrong variant", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: "123e4567-e89b-42d3-6456-426614174000", // variant 6 (invalid)
      }),
    );

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects comma-separated values", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: `${VALID_UUID},${VALID_UUID}`,
      }),
    );

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects when length is not 36", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: "too-short",
      }),
    );

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects when header contains whitespace characters", () => {
    const randomSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue(VALID_UUID);

    const id = deriveCorrelationId(
      makeRequest({
        [CORRELATION_ID_HEADER]: "123e4567-e89b-42d3 a456-426614174000",
      }),
    );

    expect(id).toBe(VALID_UUID);
    expect(randomSpy).toHaveBeenCalledTimes(1);
  });

  it("generates UUIDv4 format for missing header (matches regex and length 36)", () => {
    const id = deriveCorrelationId(makeRequest());
    expect(id.length).toBe(36);
    expect(UUID_V4_REGEX.test(id)).toBe(true);
  });
});

describe("setCorrelationIdHeader", () => {
  it("sets the correlation id response header", () => {
    const res = NextResponse.json({ ok: true });

    setCorrelationIdHeader(res, VALID_UUID);

    expect(res.headers.get(CORRELATION_ID_HEADER)).toBe(VALID_UUID);
  });
});
