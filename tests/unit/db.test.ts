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

function setGlobalPrismaStub(value: unknown): void {
  (globalThis as unknown as { prisma?: unknown }).prisma = value;
}

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

  it("exports a singleton prisma and caches it on globalThis in non-production", async () => {
    envMock.NODE_ENV = "development";

    vi.resetModules();
    deleteGlobalPrismaStub();

    const mod = await import("@/lib/db");

    expect(mod.prisma).toBeDefined();

    const globalPrisma = (globalThis as unknown as { prisma?: unknown }).prisma;
    expect(globalPrisma).toBe(mod.prisma);
  });

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
