// src/lib/correlation.ts
import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { isUuidV4 } from "@/lib/validation/patterns";

export const CORRELATION_ID_HEADER = "x-correlation-id";

/**
 * Derives a correlation ID from the request, sanitizing any incoming header.
 * Falls back to a server-generated UUID when absent/invalid.
 */
export function deriveCorrelationId(req: NextRequest): string {
  const headerValue: string | null = req.headers.get(CORRELATION_ID_HEADER);

  if (headerValue !== null) {
    const trimmed: string = headerValue.trim();
    const hasWhitespace: boolean = /\s/.test(headerValue);

    const hasSurroundingWhitespace: boolean = trimmed !== headerValue;
    const hasComma: boolean = trimmed.includes(",");
    const hasInvalidLength: boolean = trimmed.length !== 36;

    const isAcceptable: boolean =
      hasSurroundingWhitespace === false &&
      hasComma === false &&
      hasWhitespace === false &&
      hasInvalidLength === false &&
      isUuidV4(trimmed) === true;

    if (isAcceptable) {
      return trimmed.toLowerCase();
    }
  }

  return crypto.randomUUID();
}

/**
 * Attaches the correlation ID to the response headers.
 */
export function setCorrelationIdHeader(res: NextResponse, correlationId: string): void {
  res.headers.set(CORRELATION_ID_HEADER, correlationId);
}
