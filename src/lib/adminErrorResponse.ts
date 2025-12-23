// src/lib/adminErrorResponse.ts
import { NextResponse } from "next/server";

type AdminErrorOptions = {
  status: number;
  headers?: HeadersInit;
};

/**
 * Build a standardized JSON error response for admin/internal endpoints.
 *
 * Envelope: { error: <message> }
 *
 * @param message - Human-readable error message.
 * @param options - HTTP status and optional headers.
 * @returns NextResponse with JSON body.
 */
export function adminJsonError(message: string, options: AdminErrorOptions): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: options.status,
      ...(options.headers !== undefined ? { headers: options.headers } : {}),
    },
  );
}
