// tests/unit/db.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const adapterStub = { __adapter: true } as const;
const clientStub = { __client: true } as const;

const envMock: { DATABASE_URL: string; NODE_ENV: string } = {
  DATABASE_URL: "postgresql://example.test/db",
  NODE_ENV: "development",
};

const { poolCtorMock, prismaPgCtorMock, prismaClientCtorMock } = vi.hoisted(
  () => ({
    poolCtorMock: vi.fn(),
    prismaPgCtorMock: vi.fn(),
    prismaClientCtorMock: vi.fn(),
  }),
);

vi.mock("@/env", () => ({
  env: envMock,
}));

vi.mock("pg", () => {
  class Pool {
    public options: unknown;

    public constructor(options: unknown) {
      this.options = options;
      poolCtorMock(options);
    }
  }

  return { Pool };
});

vi.mock("@prisma/adapter-pg", () => {
  class PrismaPg {
    public constructor(pool: unknown) {
      prismaPgCtorMock(pool);
      return adapterStub as unknown as PrismaPg;
    }
  }

  return { PrismaPg };
});

vi.mock("@prisma/client", () => {
  class PrismaClient {
    public constructor(options: unknown) {
      prismaClientCtorMock(options);
      return clientStub as unknown as PrismaClient;
    }
  }

  return { PrismaClient };
});

/**
 * Sets a global prisma stub to control module-level singleton behavior.
 *
 * @param value - Value to assign to globalThis.prisma.
 */
function setGlobalPrismaStub(value: unknown): void {
  (globalThis as unknown as { prisma?: unknown }).prisma = value;
}

/**
 * Removes globalThis.prisma to simulate a fresh runtime.
 */
function deleteGlobalPrismaStub(): void {
  delete (globalThis as unknown as { prisma?: unknown }).prisma;
}

beforeEach(() => {
  vi.clearAllMocks();
  envMock.NODE_ENV = "development";
  deleteGlobalPrismaStub();
});

afterEach(() => {
  deleteGlobalPrismaStub();
});

describe("lib/db", () => {
  /**
   * Ensures createPrismaClient builds a Prisma client using:
   * - a pg Pool with DATABASE_URL
   * - PrismaPg adapter
   * - non-production logging + pretty error format
   */
  it("createPrismaClient uses Pool + PrismaPg adapter and non-production log settings", async () => {
    envMock.NODE_ENV = "development";

    vi.resetModules();

    // Prevent module-level prisma initialization from calling createPrismaClient()
    setGlobalPrismaStub({ __existing: true });

    const mod = await import("@/lib/db");
    const client = mod.createPrismaClient();

    expect(client).toBeDefined();

    expect(poolCtorMock).toHaveBeenCalledTimes(1);
    expect(poolCtorMock).toHaveBeenCalledWith({
      connectionString: "postgresql://example.test/db",
    });

    expect(prismaPgCtorMock).toHaveBeenCalledTimes(1);

    expect(prismaClientCtorMock).toHaveBeenCalledTimes(1);
    const prismaClientArgs = prismaClientCtorMock.mock.calls[0]?.[0] as {
      adapter?: unknown;
      log?: unknown;
      errorFormat?: unknown;
    };

    expect(prismaClientArgs.adapter).toBe(adapterStub);
    expect(prismaClientArgs.log).toEqual(["warn", "error"]);
    expect(prismaClientArgs.errorFormat).toBe("pretty");
  });

  /**
   * Ensures production mode uses the stricter logging + minimal error format
   * to reduce noise and payload size.
   */
  it("createPrismaClient uses production log settings when NODE_ENV=production", async () => {
    envMock.NODE_ENV = "production";

    vi.resetModules();

    // Prevent module-level prisma initialization from calling createPrismaClient()
    setGlobalPrismaStub({ __existing: true });

    const mod = await import("@/lib/db");
    const client = mod.createPrismaClient();

    expect(client).toBeDefined();

    expect(poolCtorMock).toHaveBeenCalledTimes(1);
    expect(prismaPgCtorMock).toHaveBeenCalledTimes(1);
    expect(prismaClientCtorMock).toHaveBeenCalledTimes(1);

    const prismaClientArgs = prismaClientCtorMock.mock.calls[0]?.[0] as {
      adapter?: unknown;
      log?: unknown;
      errorFormat?: unknown;
    };

    expect(prismaClientArgs.adapter).toBe(adapterStub);
    expect(prismaClientArgs.log).toEqual(["error"]);
    expect(prismaClientArgs.errorFormat).toBe("minimal");
  });

  /**
   * Ensures the module exports a singleton `prisma` instance and, in
   * non-production, caches it on globalThis to support hot reload / dev server
   * re-import behavior without creating multiple client instances.
   */
  it("exports a singleton prisma and caches it on globalThis in non-production", async () => {
    envMock.NODE_ENV = "development";

    vi.resetModules();
    deleteGlobalPrismaStub();

    const mod = await import("@/lib/db");

    expect(mod.prisma).toBeDefined();

    const globalPrisma = (globalThis as unknown as { prisma?: unknown }).prisma;
    expect(globalPrisma).toBe(mod.prisma);
  });

  /**
   * Ensures production does not cache prisma on globalThis so that each runtime
   * relies on module scoping and avoids leaking state between executions.
   */
  it("does not cache prisma on globalThis in production", async () => {
    envMock.NODE_ENV = "production";

    vi.resetModules();
    deleteGlobalPrismaStub();

    const mod = await import("@/lib/db");

    expect(mod.prisma).toBeDefined();

    const globalPrisma = (globalThis as unknown as { prisma?: unknown }).prisma;
    expect(globalPrisma).toBeUndefined();
  });
});
