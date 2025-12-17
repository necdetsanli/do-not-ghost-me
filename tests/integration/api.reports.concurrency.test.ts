// tests/integration/api.reports.concurrency.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PositionCategory } from "@prisma/client";

type EnvSnapshot = Record<string, string | undefined>;

function snapshotEnv(): EnvSnapshot {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    RATE_LIMIT_IP_SALT: process.env.RATE_LIMIT_IP_SALT,
    RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP:
      process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP,
    RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY:
      process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    ADMIN_ALLOWED_HOST: process.env.ADMIN_ALLOWED_HOST,
    ADMIN_CSRF_SECRET: process.env.ADMIN_CSRF_SECRET,
  };
}

function restoreEnv(snap: EnvSnapshot): void {
  const setOrDelete = (key: keyof EnvSnapshot): void => {
    const value = snap[key];

    if (value === undefined) {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  };

  setOrDelete("NODE_ENV");
  setOrDelete("DATABASE_URL");
  setOrDelete("RATE_LIMIT_IP_SALT");
  setOrDelete("RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP");
  setOrDelete("RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY");
  setOrDelete("ADMIN_PASSWORD");
  setOrDelete("ADMIN_SESSION_SECRET");
  setOrDelete("ADMIN_ALLOWED_HOST");
  setOrDelete("ADMIN_CSRF_SECRET");
}

function applyBaseEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
  process.env.RATE_LIMIT_IP_SALT =
    "test-rate-limit-salt-32-bytes-minimum-000000";
  process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "3";
  process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "10";

  // Keep admin vars consistent with env invariants.
  process.env.ADMIN_PASSWORD = "test-admin-password";
  process.env.ADMIN_SESSION_SECRET =
    "test-admin-session-secret-32-bytes-minimum-0000000";
  process.env.ADMIN_CSRF_SECRET =
    "test-admin-csrf-secret-32-bytes-minimum-000000000";

  // IMPORTANT: Do not set undefined. Use a valid host or delete.
  process.env.ADMIN_ALLOWED_HOST = "example.test";
}

/**
 * Deferred promise helper for deterministic concurrency orchestration.
 */
type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  isSettled: boolean;
};

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

type DailyRow = {
  id: string;
  ipHash: string;
  day: string;
  count: number;
};

type CompanyLimitRow = {
  ipHash: string;
  companyId: string;
  positionKey: string;
};

type ReportRow = {
  id: string;
  createdAt: Date;
};

type PrismaErrorWithCode = Error & { code?: string };

const {
  stateRef,
  dailyGateRef,
  companyGateRef,
  reportIdCounterRef,
  lockTailRef,
} = vi.hoisted(() => {
  return {
    stateRef: {
      current: {
        dailyCommitted: new Map<string, DailyRow>(),
        dailyPending: new Map<
          string,
          { row: DailyRow; done: Deferred<void> }
        >(),
        companyCommitted: new Map<string, CompanyLimitRow>(),
        companyPending: new Map<
          string,
          { row: CompanyLimitRow; done: Deferred<void> }
        >(),
        createdReports: [] as ReportRow[],
      },
    },
    dailyGateRef: { current: createDeferred<void>() },
    companyGateRef: { current: createDeferred<void>() },
    reportIdCounterRef: { current: 0 },
    lockTailRef: { current: new Map<string, Promise<void>>() },
  };
});

function dailyKey(ipHash: string, day: string): string {
  return `${ipHash}::${day}`;
}

function companyKey(
  ipHash: string,
  companyId: string,
  positionKey: string,
): string {
  return `${ipHash}::${companyId}::${positionKey}`;
}

function companyLockKey(ipHash: string, companyId: string): string {
  return `${ipHash}::${companyId}`;
}

function resetMockState(): void {
  stateRef.current.dailyCommitted = new Map<string, DailyRow>();
  stateRef.current.dailyPending = new Map<
    string,
    { row: DailyRow; done: Deferred<void> }
  >();
  stateRef.current.companyCommitted = new Map<string, CompanyLimitRow>();
  stateRef.current.companyPending = new Map<
    string,
    { row: CompanyLimitRow; done: Deferred<void> }
  >();
  stateRef.current.createdReports = [];

  dailyGateRef.current = createDeferred<void>();
  companyGateRef.current = createDeferred<void>();
  reportIdCounterRef.current = 0;

  lockTailRef.current = new Map<string, Promise<void>>();
}

vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
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

vi.mock("@/lib/ip", () => ({
  getClientIp: (req: NextRequest) => req.headers.get("x-forwarded-for"),
}));

vi.mock("@/lib/company", () => ({
  findOrCreateCompanyForReport: async () => ({ id: "company-1" }),
}));

vi.mock("@/lib/validation/reportSchema", () => ({
  reportSchema: {
    safeParse: (input: unknown) => {
      return { success: true, data: input };
    },
  },
}));

vi.mock("@/lib/dates", async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    toUtcDayKey: () => "2025-01-01",
  };
});

vi.mock("@/lib/db", () => {
  const prisma = {
    $transaction: async (fn: (tx: any) => Promise<void>) => {
      /**
       * Transaction-local staged writes (commit on success, discard on failure).
       */
      const stagedDaily = new Map<string, DailyRow>();
      const stagedCompany = new Map<string, CompanyLimitRow>();
      const ownedPendingDailyKeys: string[] = [];
      const ownedPendingCompanyKeys: string[] = [];
      const lockReleases: Array<() => void> = [];

      const acquireCompanyLock = async (
        ipHash: string,
        companyId: string,
      ): Promise<void> => {
        const key = companyLockKey(ipHash, companyId);
        const tail = lockTailRef.current.get(key) ?? Promise.resolve();

        let release!: () => void;
        const next = new Promise<void>((res) => {
          release = res;
        });

        lockTailRef.current.set(
          key,
          tail.then(() => next),
        );

        await tail;

        lockReleases.push(() => {
          release();
        });
      };

      const tx = {
        /**
         * Simulate pg_advisory_xact_lock(hashtext(ipHash), hashtext(companyId)).
         * Called as a tagged template: (strings, ipHash, companyId).
         */
        $executeRaw: async (
          _strings: TemplateStringsArray,
          ipHash: string,
          companyId: string,
        ) => {
          await acquireCompanyLock(String(ipHash), String(companyId));
          return 0;
        },

        reportIpDailyLimit: {
          upsert: async (args: unknown) => {
            const a = args as {
              where?: { uniq_ip_day?: { ipHash?: string; day?: string } };
              create?: { ipHash?: string; day?: string; count?: number };
              update?: { count?: { increment?: number } };
              select?: { id?: boolean; count?: boolean };
            };

            const ipHash = String(a.where?.uniq_ip_day?.ipHash ?? "");
            const day = String(a.where?.uniq_ip_day?.day ?? "");
            const key = dailyKey(ipHash, day);

            const staged = stagedDaily.get(key);
            if (staged !== undefined) {
              return { id: staged.id, count: staged.count };
            }

            const committed = stateRef.current.dailyCommitted.get(key);
            if (committed !== undefined) {
              const inc = Number(a.update?.count?.increment ?? 1);
              const next: DailyRow = {
                ...committed,
                count: committed.count + inc,
              };
              stagedDaily.set(key, next);
              return { id: next.id, count: next.count };
            }

            const pending = stateRef.current.dailyPending.get(key);
            if (pending !== undefined) {
              // Wait for the other transaction to finish (commit/rollback).
              await pending.done.promise;

              const committedAfter = stateRef.current.dailyCommitted.get(key);
              if (committedAfter === undefined) {
                // Other tx rolled back; treat as insert.
                const count = Number(a.create?.count ?? 1);
                const row: DailyRow = {
                  id: `daily-${key}`,
                  ipHash,
                  day,
                  count,
                };
                stateRef.current.dailyPending.set(key, {
                  row,
                  done: createDeferred<void>(),
                });
                ownedPendingDailyKeys.push(key);

                await dailyGateRef.current.promise;

                stagedDaily.set(key, row);
                return { id: row.id, count: row.count };
              }

              const inc = Number(a.update?.count?.increment ?? 1);
              const next: DailyRow = {
                ...committedAfter,
                count: committedAfter.count + inc,
              };
              stagedDaily.set(key, next);
              return { id: next.id, count: next.count };
            }

            // First insert for this key in the whole system: create pending and wait the gate.
            const count = Number(a.create?.count ?? 1);
            const row: DailyRow = { id: `daily-${key}`, ipHash, day, count };
            stateRef.current.dailyPending.set(key, {
              row,
              done: createDeferred<void>(),
            });
            ownedPendingDailyKeys.push(key);

            await dailyGateRef.current.promise;

            stagedDaily.set(key, row);
            return { id: row.id, count: row.count };
          },
        },

        reportIpCompanyLimit: {
          count: async (args: unknown) => {
            const a = args as {
              where?: { ipHash?: string; companyId?: string };
            };
            const ipHash = String(a.where?.ipHash ?? "");
            const companyId = String(a.where?.companyId ?? "");

            let total = 0;

            for (const row of stateRef.current.companyCommitted.values()) {
              if (row.ipHash === ipHash && row.companyId === companyId) {
                total += 1;
              }
            }

            for (const row of stagedCompany.values()) {
              if (row.ipHash === ipHash && row.companyId === companyId) {
                total += 1;
              }
            }

            return total;
          },

          create: async (args: unknown) => {
            const a = args as {
              data?: {
                ipHash?: string;
                companyId?: string;
                positionKey?: string;
              };
            };

            const ipHash = String(a.data?.ipHash ?? "");
            const companyId = String(a.data?.companyId ?? "");
            const positionKey = String(a.data?.positionKey ?? "");
            const key = companyKey(ipHash, companyId, positionKey);

            const committed = stateRef.current.companyCommitted.get(key);
            if (committed !== undefined) {
              const err: PrismaErrorWithCode = new Error(
                "Unique constraint failed",
              );
              err.code = "P2002";
              throw err;
            }

            const pending = stateRef.current.companyPending.get(key);
            if (pending !== undefined) {
              await pending.done.promise;
              const committedAfter = stateRef.current.companyCommitted.get(key);
              if (committedAfter !== undefined) {
                const err: PrismaErrorWithCode = new Error(
                  "Unique constraint failed",
                );
                err.code = "P2002";
                throw err;
              }
            }

            // Create pending, wait the gate, then stage for commit.
            const row: CompanyLimitRow = { ipHash, companyId, positionKey };
            stateRef.current.companyPending.set(key, {
              row,
              done: createDeferred<void>(),
            });
            ownedPendingCompanyKeys.push(key);

            await companyGateRef.current.promise;

            stagedCompany.set(key, row);
            return row;
          },
        },
      };

      let ok = false;

      try {
        await fn(tx);
        ok = true;

        // Commit staged daily.
        for (const [k, row] of stagedDaily.entries()) {
          stateRef.current.dailyCommitted.set(k, row);
        }

        // Commit staged company rows.
        for (const [k, row] of stagedCompany.entries()) {
          stateRef.current.companyCommitted.set(k, row);
        }
      } finally {
        // Resolve and cleanup pending rows owned by this tx (commit or rollback).
        for (const k of ownedPendingDailyKeys) {
          const p = stateRef.current.dailyPending.get(k);
          if (p !== undefined) {
            stateRef.current.dailyPending.delete(k);
            p.done.resolve();
          }
          if (ok !== true) {
            // rollback: ensure we did not accidentally commit
            // (stagedDaily is not applied when ok=false)
          }
        }

        for (const k of ownedPendingCompanyKeys) {
          const p = stateRef.current.companyPending.get(k);
          if (p !== undefined) {
            stateRef.current.companyPending.delete(k);
            p.done.resolve();
          }
        }

        for (const release of lockReleases) {
          release();
        }
      }
    },

    report: {
      create: async () => {
        reportIdCounterRef.current += 1;
        const row: ReportRow = {
          id: `r-${reportIdCounterRef.current}`,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
        };

        stateRef.current.createdReports.push(row);
        return row;
      },
    },
  };

  return { prisma };
});

function buildReportsPostRequest(
  url: string,
  ip: string,
  body: unknown,
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

async function importReportsPost(): Promise<{
  POST: (req: NextRequest) => Promise<Response>;
}> {
  vi.resetModules();
  const mod = await import("@/app/api/reports/route");
  return { POST: mod.POST as (req: NextRequest) => Promise<Response> };
}

describe.sequential("POST /api/reports concurrency", () => {
  let snap: EnvSnapshot;

  beforeEach(() => {
    snap = snapshotEnv();
    applyBaseEnv();
    resetMockState();
  });

  afterEach(() => {
    if (dailyGateRef.current.isSettled !== true) {
      dailyGateRef.current.resolve();
    }
    if (companyGateRef.current.isSettled !== true) {
      companyGateRef.current.resolve();
    }

    restoreEnv(snap);
    vi.restoreAllMocks();
  });

  it("handles concurrent daily upsert and returns 200 for both requests", async () => {
    const { POST } = await importReportsPost();

    const url = "https://example.test/api/reports";
    const ip = "203.0.113.50";

    companyGateRef.current.resolve();

    const req1 = buildReportsPostRequest(url, ip, {
      companyName: "Concurrency Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "backend",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const req2 = buildReportsPostRequest(url, ip, {
      companyName: "Concurrency Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "frontend",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const p1 = POST(req1);
    const p2 = POST(req2);

    await Promise.resolve();

    dailyGateRef.current.resolve();

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    expect(stateRef.current.createdReports.length).toBe(2);

    const committedRows = Array.from(stateRef.current.dailyCommitted.values());
    expect(committedRows.length).toBe(1);
    expect(committedRows[0]?.count).toBe(2);
  });

  it("enforces duplicate (company + position) under concurrency: one 200 and one 429", async () => {
    const { POST } = await importReportsPost();

    const url = "https://example.test/api/reports";
    const ip = "203.0.113.51";

    dailyGateRef.current.resolve();

    const req1 = buildReportsPostRequest(url, ip, {
      companyName: "Dup Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "same-position",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const req2 = buildReportsPostRequest(url, ip, {
      companyName: "Dup Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "same-position",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const p1 = POST(req1);
    const p2 = POST(req2);

    await Promise.resolve();

    companyGateRef.current.resolve();

    const results = await Promise.allSettled([p1, p2]);

    const statuses: number[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        statuses.push(r.value.status);
      } else {
        statuses.push(0);
      }
    }

    statuses.sort((a, b) => a - b);
    expect(statuses).toEqual([200, 429]);

    expect(stateRef.current.createdReports.length).toBe(1);
  });

  it("daily limit boundary under concurrency: one 200 and one 429, daily count remains 1 (rollback)", async () => {
    process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "1";

    const { POST } = await importReportsPost();

    const url = "https://example.test/api/reports";
    const ip = "203.0.113.60";

    companyGateRef.current.resolve();

    const req1 = buildReportsPostRequest(url, ip, {
      companyName: "DailyLimit Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "backend",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const req2 = buildReportsPostRequest(url, ip, {
      companyName: "DailyLimit Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "frontend",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const p1 = POST(req1);
    const p2 = POST(req2);

    await Promise.resolve();
    dailyGateRef.current.resolve();

    const results = await Promise.allSettled([p1, p2]);

    const statuses: number[] = results.map((r) =>
      r.status === "fulfilled" ? r.value.status : 0,
    );
    statuses.sort((a, b) => a - b);

    expect(statuses).toEqual([200, 429]);

    expect(stateRef.current.createdReports.length).toBe(1);

    const committedRows = Array.from(stateRef.current.dailyCommitted.values());
    expect(committedRows.length).toBe(1);
    expect(committedRows[0]?.count).toBe(1);
  });

  it("per-company limit boundary under concurrency: one 200 and one 429, daily count remains 1 (rollback)", async () => {
    process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "1";
    process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "10";

    const { POST } = await importReportsPost();

    const url = "https://example.test/api/reports";
    const ip = "203.0.113.61";

    // Allow daily quickly; we want the per-company strictness to do the gating.
    dailyGateRef.current.resolve();

    const req1 = buildReportsPostRequest(url, ip, {
      companyName: "PerCompany Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "backend",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const req2 = buildReportsPostRequest(url, ip, {
      companyName: "PerCompany Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "frontend",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const p1 = POST(req1);
    const p2 = POST(req2);

    await Promise.resolve();

    // Release the company create gate so the first tx can commit; the second should then fail on per-company count.
    companyGateRef.current.resolve();

    const results = await Promise.allSettled([p1, p2]);

    const statuses: number[] = results.map((r) =>
      r.status === "fulfilled" ? r.value.status : 0,
    );
    statuses.sort((a, b) => a - b);

    expect(statuses).toEqual([200, 429]);

    expect(stateRef.current.createdReports.length).toBe(1);

    const committedRows = Array.from(stateRef.current.dailyCommitted.values());
    expect(committedRows.length).toBe(1);
    expect(committedRows[0]?.count).toBe(1);
  });

  it("duplicate position rejects without incrementing daily count (rollback)", async () => {
    process.env.RATE_LIMIT_MAX_REPORTS_PER_IP_PER_DAY = "10";
    process.env.RATE_LIMIT_MAX_REPORTS_PER_COMPANY_PER_IP = "5";

    const { POST } = await importReportsPost();

    const url = "https://example.test/api/reports";
    const ip = "203.0.113.62";

    dailyGateRef.current.resolve();

    const req1 = buildReportsPostRequest(url, ip, {
      companyName: "DupRollback Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "same-position",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const req2 = buildReportsPostRequest(url, ip, {
      companyName: "DupRollback Corp",
      stage: "TECHNICAL",
      jobLevel: "JUNIOR",
      positionCategory: PositionCategory.ENGINEERING,
      positionDetail: "same-position",
      daysWithoutReply: 10,
      country: "DE",
      honeypot: "",
    });

    const p1 = POST(req1);
    const p2 = POST(req2);

    await Promise.resolve();
    companyGateRef.current.resolve();

    const results = await Promise.allSettled([p1, p2]);
    const statuses: number[] = results.map((r) =>
      r.status === "fulfilled" ? r.value.status : 0,
    );
    statuses.sort((a, b) => a - b);

    expect(statuses).toEqual([200, 429]);

    expect(stateRef.current.createdReports.length).toBe(1);

    const committedRows = Array.from(stateRef.current.dailyCommitted.values());
    expect(committedRows.length).toBe(1);
    expect(committedRows[0]?.count).toBe(1);
  });
});
