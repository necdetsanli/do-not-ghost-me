// tests/unit/rateLimit.concurrency.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PositionCategory } from "@prisma/client";

/**
 * Deferred promise helper for deterministic interleaving in concurrency tests.
 */
type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  isSettled: boolean;
};

/**
 * Creates a deferred promise.
 *
 * @returns Deferred object.
 */
function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;

  const deferred: Deferred<T> = {
    promise: Promise.resolve(undefined as unknown as T),
    resolve: () => undefined as unknown as void,
    reject: () => undefined as unknown as void,
    isSettled: false,
  };

  deferred.promise = new Promise<T>((res, rej) => {
    deferred.resolve = (value: T) => {
      deferred.isSettled = true;
      res(value);
    };
    deferred.reject = (reason: unknown) => {
      deferred.isSettled = true;
      rej(reason);
    };
  });

  return deferred;
}

type DailyRow = { id: string; ipHash: string; day: string; count: number };
type CompanyRow = { ipHash: string; companyId: string; positionKey: string };
type PrismaErrorWithCode = Error & { code?: string };

const { dayKey, dailyGateRef, dailyRowRef, companyRowsRef, txRef } = vi.hoisted(
  () => {
    return {
      dayKey: "2025-01-01",
      dailyGateRef: { current: createDeferred<void>() },
      dailyRowRef: { current: null as DailyRow | null },
      companyRowsRef: { current: [] as CompanyRow[] },
      txRef: {
        current: null as null | {
          $executeRaw: (
            strings: TemplateStringsArray,
            ...values: unknown[]
          ) => Promise<number>;
          reportIpDailyLimit: {
            upsert: (args: unknown) => Promise<{ id: string; count: number }>;
          };
          reportIpCompanyLimit: {
            count: (args: unknown) => Promise<number>;
            create: (args: unknown) => Promise<CompanyRow>;
          };
        },
      },
    };
  },
);

vi.mock("@/lib/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/errorUtils", () => ({
  formatUnknownError: (e: unknown) => String(e),
}));

vi.mock("@/lib/prismaErrors", () => ({
  hasPrismaErrorCode: (e: unknown, code: string) => {
    const err = e as { code?: unknown };
    return typeof err?.code === "string" && err.code === code;
  },
}));

vi.mock("@/lib/dates", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    toUtcDayKey: () => dayKey,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      if (txRef.current === null) {
        throw new Error("txRef.current is not initialized");
      }
      await fn(txRef.current);
    },
  },
}));

/**
 * Resets the in-memory mocked database state.
 *
 * @returns void
 */
function resetMockState(): void {
  dailyGateRef.current = createDeferred<void>();
  dailyRowRef.current = null;
  companyRowsRef.current = [];

  txRef.current = {
    $executeRaw: async () => 0,

    reportIpDailyLimit: {
      upsert: async (args: unknown) => {
        // First caller: create row but wait to simulate in-flight insert.
        if (dailyRowRef.current === null) {
          const a = args as {
            where?: { uniq_ip_day?: { ipHash?: string; day?: string } };
          };

          const ipHash = String(a.where?.uniq_ip_day?.ipHash ?? "");
          const day = String(a.where?.uniq_ip_day?.day ?? "");

          const row: DailyRow = { id: "daily-1", ipHash, day, count: 1 };
          dailyRowRef.current = row;

          await dailyGateRef.current.promise;
          return { id: row.id, count: row.count };
        }

        // Second caller: wait until first passes the gate, then increment.
        await dailyGateRef.current.promise;

        const row = dailyRowRef.current;
        if (row === null) {
          throw new Error("dailyRowRef.current is null in upsert()");
        }

        row.count += 1;
        dailyRowRef.current = row;
        return { id: row.id, count: row.count };
      },
    },

    reportIpCompanyLimit: {
      count: async (args: unknown) => {
        const a = args as { where?: { ipHash?: string; companyId?: string } };
        const ipHash = String(a.where?.ipHash ?? "");
        const companyId = String(a.where?.companyId ?? "");

        return companyRowsRef.current.filter(
          (r) => r.ipHash === ipHash && r.companyId === companyId,
        ).length;
      },

      create: async (args: unknown) => {
        const a = args as {
          data?: { ipHash?: string; companyId?: string; positionKey?: string };
        };

        const ipHash = String(a.data?.ipHash ?? "");
        const companyId = String(a.data?.companyId ?? "");
        const positionKey = String(a.data?.positionKey ?? "");

        const exists = companyRowsRef.current.some(
          (r) =>
            r.ipHash === ipHash &&
            r.companyId === companyId &&
            r.positionKey === positionKey,
        );

        if (exists) {
          const err: PrismaErrorWithCode = new Error(
            "Unique constraint failed",
          );
          err.code = "P2002";
          throw err;
        }

        const row: CompanyRow = { ipHash, companyId, positionKey };
        companyRowsRef.current.push(row);
        return row;
      },
    },
  };
}

describe.sequential("rateLimit concurrency behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    resetMockState();
  });

  afterEach(() => {
    if (dailyGateRef.current.isSettled !== true) {
      dailyGateRef.current.resolve();
    }
    vi.restoreAllMocks();
  });

  it("handles concurrent daily limit row creation without throwing when under max", async () => {
    const { enforceReportLimitForIpCompanyPosition } =
      await import("@/lib/rateLimit");

    const argsA = {
      ip: "203.0.113.10",
      companyId: "c1",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "backend",
    };

    const argsB = {
      ip: "203.0.113.10",
      companyId: "c1",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "frontend",
    };

    const p1 = enforceReportLimitForIpCompanyPosition(argsA);
    const p2 = enforceReportLimitForIpCompanyPosition(argsB);

    await Promise.resolve();
    dailyGateRef.current.resolve();

    const results = await Promise.allSettled([p1, p2]);
    const rejected = results.filter((r) => r.status === "rejected");

    expect(rejected.length).toBe(0);
    expect(dailyRowRef.current?.count).toBe(2);
  });

  it("enforces duplicate position under concurrency (one succeeds, one rejects)", async () => {
    const { enforceReportLimitForIpCompanyPosition } =
      await import("@/lib/rateLimit");

    const args = {
      ip: "203.0.113.11",
      companyId: "c2",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "same-position",
    };

    const p1 = enforceReportLimitForIpCompanyPosition(args);
    const p2 = enforceReportLimitForIpCompanyPosition(args);

    await Promise.resolve();
    dailyGateRef.current.resolve();

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    const msg = reason instanceof Error ? reason.message : String(reason);

    expect(msg.toLowerCase()).toContain("already submitted a report");
  });
});
