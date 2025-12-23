// tests/unit/adminErrorResponse.test.ts
import { describe, expect, it } from "vitest";
import { adminJsonError } from "@/lib/adminErrorResponse";

describe("adminJsonError", () => {
  it("returns a JSON response with the provided status and error envelope", async () => {
    const res = adminJsonError("Bad things", { status: 418 });

    expect(res.status).toBe(418);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "Bad things" });
  });

  it("applies optional headers", () => {
    const res = adminJsonError("Nope", {
      status: 401,
      headers: { "cache-control": "no-store" },
    });

    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
