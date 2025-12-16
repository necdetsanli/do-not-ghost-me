// tests/unit/validation.reportSchema.test.ts
import { describe, it, expect } from "vitest";
import { reportSchema } from "@/lib/validation/reportSchema";
import { CountryCode, JobLevel, PositionCategory, Stage } from "@prisma/client";

type EnumLike = Record<string, string | number>;

/**
 * @param enumObj - Prisma enum object.
 * @returns First enum value (stable enough for unit tests).
 */
function pickFirstEnumValue<T extends EnumLike>(enumObj: T): T[keyof T] {
  const values = Object.values(enumObj);
  const first = values[0];
  if (first === undefined) {
    throw new Error("Enum has no values");
  }
  return first as T[keyof T];
}

/**
 * @returns A minimal valid payload for reportSchema.
 */
function makeValidPayload(): Record<string, unknown> {
  return {
    companyName: "Happy Path Corp",
    stage: pickFirstEnumValue(Stage),
    jobLevel: pickFirstEnumValue(JobLevel),
    positionCategory: pickFirstEnumValue(PositionCategory),
    positionDetail: "Backend Developer",
    country: pickFirstEnumValue(CountryCode),
  };
}

describe("reportSchema", () => {
  it("accepts a minimal valid payload (daysWithoutReply and honeypot omitted)", () => {
    const payload = makeValidPayload();
    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (parsed.success === true) {
      expect(parsed.data.daysWithoutReply).toBeUndefined();
      expect(parsed.data.honeypot).toBeUndefined();
    }
  });

  it("trims companyName and positionDetail", () => {
    const payload = makeValidPayload();
    payload.companyName = "  ACME  ";
    payload.positionDetail = "  SRE  ";

    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (parsed.success === true) {
      expect(parsed.data.companyName).toBe("ACME");
      expect(parsed.data.positionDetail).toBe("SRE");
    }
  });

  it("rejects companyName that contains invalid characters (newline)", () => {
    const payload = makeValidPayload();
    payload.companyName = "Bad\nName";

    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
    if (parsed.success === false) {
      const issue = parsed.error.issues.find(
        (i) => i.path.join(".") === "companyName",
      );
      expect(issue).toBeDefined();
    }
  });

  it("rejects companyName that has no letters (digits only)", () => {
    const payload = makeValidPayload();
    payload.companyName = "12345";

    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
    if (parsed.success === false) {
      const issue = parsed.error.issues.find(
        (i) => i.path.join(".") === "companyName",
      );
      expect(issue).toBeDefined();
      expect(issue?.message.toLowerCase()).toContain("at least one letter");
    }
  });

  it("rejects positionDetail when too short after trim", () => {
    const payload = makeValidPayload();
    payload.positionDetail = "  a  ";

    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
    if (parsed.success === false) {
      const issue = parsed.error.issues.find(
        (i) => i.path.join(".") === "positionDetail",
      );
      expect(issue).toBeDefined();
      expect(issue?.message.toLowerCase()).toContain("at least");
    }
  });

  it("rejects invalid enum values (stage)", () => {
    const payload = makeValidPayload();
    payload.stage = "NOT_A_STAGE";

    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
    if (parsed.success === false) {
      const issue = parsed.error.issues.find(
        (i) => i.path.join(".") === "stage",
      );
      expect(issue).toBeDefined();
    }
  });

  it("rejects invalid country code", () => {
    const payload = makeValidPayload();
    payload.country = "NOT_A_COUNTRY";

    const parsed = reportSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
    if (parsed.success === false) {
      const issue = parsed.error.issues.find(
        (i) => i.path.join(".") === "country",
      );
      expect(issue).toBeDefined();
      // If you enforce a custom message via errorMap, this should match:
      // expect(issue?.message).toBe("Please select a valid country");
    }
  });

  describe("daysWithoutReply preprocessing + validation", () => {
    it("treats undefined as 'not provided'", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = undefined;

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
      if (parsed.success === true) {
        expect(parsed.data.daysWithoutReply).toBeUndefined();
      }
    });

    it("treats null as 'not provided'", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = null;

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
      if (parsed.success === true) {
        expect(parsed.data.daysWithoutReply).toBeUndefined();
      }
    });

    it("treats empty/whitespace string as 'not provided'", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = "   ";

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
      if (parsed.success === true) {
        expect(parsed.data.daysWithoutReply).toBeUndefined();
      }
    });

    it("parses numeric strings into numbers", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = "12";

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
      if (parsed.success === true) {
        expect(parsed.data.daysWithoutReply).toBe(12);
      }
    });

    it("accepts a number directly when in range", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = 1;

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
      if (parsed.success === true) {
        expect(parsed.data.daysWithoutReply).toBe(1);
      }
    });

    it("rejects non-finite / non-numeric strings", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = "not-a-number";

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(false);
      if (parsed.success === false) {
        const issue = parsed.error.issues.find(
          (i) => i.path.join(".") === "daysWithoutReply",
        );
        expect(issue).toBeDefined();
      }
    });

    it("rejects non-integers (e.g. '3.5')", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = "3.5";

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(false);
      if (parsed.success === false) {
        const issue = parsed.error.issues.find(
          (i) => i.path.join(".") === "daysWithoutReply",
        );
        expect(issue).toBeDefined();
        expect(issue?.message.toLowerCase()).toContain("integer");
      }
    });

    it("rejects out-of-range numbers (<1 or >365)", () => {
      const payloadLow = makeValidPayload();
      payloadLow.daysWithoutReply = 0;

      const parsedLow = reportSchema.safeParse(payloadLow);
      expect(parsedLow.success).toBe(false);

      const payloadHigh = makeValidPayload();
      payloadHigh.daysWithoutReply = 366;

      const parsedHigh = reportSchema.safeParse(payloadHigh);
      expect(parsedHigh.success).toBe(false);
    });

    it("rejects unsupported raw types (object)", () => {
      const payload = makeValidPayload();
      payload.daysWithoutReply = { any: "thing" };

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(false);
      if (parsed.success === false) {
        const issue = parsed.error.issues.find(
          (i) => i.path.join(".") === "daysWithoutReply",
        );
        expect(issue).toBeDefined();
      }
    });
  });

  describe("honeypot", () => {
    it("accepts honeypot when omitted", () => {
      const payload = makeValidPayload();

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
    });

    it("accepts honeypot when explicitly empty string", () => {
      const payload = makeValidPayload();
      payload.honeypot = "";

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(true);
      if (parsed.success === true) {
        expect(parsed.data.honeypot).toBe("");
      }
    });

    it("rejects honeypot when non-empty", () => {
      const payload = makeValidPayload();
      payload.honeypot = "bot";

      const parsed = reportSchema.safeParse(payload);

      expect(parsed.success).toBe(false);
      if (parsed.success === false) {
        const issue = parsed.error.issues.find(
          (i) => i.path.join(".") === "honeypot",
        );
        expect(issue).toBeDefined();
      }
    });
  });
});
