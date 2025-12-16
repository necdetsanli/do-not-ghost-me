import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";

type StreamMock = {
  destroyed: boolean;
  write: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

const { fsMock } = vi.hoisted(() => ({
  fsMock: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    createWriteStream: vi.fn(),
  },
}));

vi.mock("node:fs", () => ({
  default: fsMock,
}));

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function makeStream(): StreamMock {
  const stream: StreamMock = {
    destroyed: false,
    write: vi.fn(),
    on: vi.fn(),
  };
  stream.on.mockImplementation(() => stream);
  return stream;
}

async function loadLogger() {
  vi.resetModules();
  return import("@/lib/logger");
}

const originalEnv = { ...process.env };

describe("lib/logger", () => {
  beforeEach(() => {
    fsMock.existsSync.mockReset();
    fsMock.mkdirSync.mockReset();
    fsMock.createWriteStream.mockReset();

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    setEnv({
      APP_LOG_LEVEL: undefined,
      APP_LOG_TO_FILE: undefined,
      APP_LOG_FILE: undefined,
      NODE_ENV: "test",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // restore env
    for (const key of Object.keys(process.env)) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key] as string;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        globalThis as unknown as object,
        "window",
      )
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;
    }
  });

  it("defaults to debug level in non-production when APP_LOG_LEVEL is missing", async () => {
    setEnv({ NODE_ENV: "test", APP_LOG_LEVEL: undefined });

    const { logDebug } = await loadLogger();
    logDebug("hello");

    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("defaults to info level in production when APP_LOG_LEVEL is missing", async () => {
    setEnv({ NODE_ENV: "production", APP_LOG_LEVEL: undefined });

    const { logDebug } = await loadLogger();
    logDebug("hello");

    expect(console.log).toHaveBeenCalledTimes(0);
  });

  it("honors APP_LOG_LEVEL threshold (warn drops info)", async () => {
    setEnv({ NODE_ENV: "test", APP_LOG_LEVEL: "warn" });

    const { logInfo, logWarn } = await loadLogger();

    logInfo("info");
    logWarn("warn");

    expect(console.log).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("includes JSON context when it can stringify", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const { logInfo } = await loadLogger();

    logInfo("hello", { a: 1 });

    expect(console.log).toHaveBeenCalledTimes(1);

    const line = (console.log as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0]?.[0];
    expect(String(line)).toContain("[2025-01-01T00:00:00.000Z]");
    expect(String(line)).toContain("hello");
    expect(String(line)).toContain('"a":1');

    vi.useRealTimers();
  });

  it("does not throw if context stringify fails (circular)", async () => {
    const { logInfo } = await loadLogger();

    const ctx: Record<string, unknown> = {};
    ctx.self = ctx;

    expect(() => logInfo("hello", ctx)).not.toThrow();

    expect(console.error).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it("does not attempt file I/O in browser-like environments (window defined)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {};

    setEnv({
      APP_LOG_TO_FILE: "true",
      APP_LOG_FILE: "logs/test.log",
    });

    const { logInfo } = await loadLogger();
    logInfo("hello");

    expect(fsMock.createWriteStream).toHaveBeenCalledTimes(0);
  });

  it("writes to file when enabled and in server environment", async () => {
    const stream = makeStream();
    fsMock.existsSync.mockReturnValue(false);
    fsMock.createWriteStream.mockReturnValue(stream);

    setEnv({
      APP_LOG_TO_FILE: "true",
      APP_LOG_FILE: "logs/test.log",
      APP_LOG_LEVEL: "debug",
    });

    const { logInfo } = await loadLogger();

    logInfo("hello");
    logInfo("hello2");

    expect(fsMock.mkdirSync).toHaveBeenCalledTimes(1);
    expect(fsMock.createWriteStream).toHaveBeenCalledTimes(1);

    const expectedPath = path.resolve("logs/test.log");
    expect(fsMock.createWriteStream).toHaveBeenCalledWith(expectedPath, {
      flags: "a",
      encoding: "utf8",
    });

    expect(stream.write).toHaveBeenCalledTimes(2);
  });

  it("never throws if file stream initialization fails", async () => {
    fsMock.createWriteStream.mockImplementation(() => {
      throw new Error("boom");
    });

    setEnv({
      APP_LOG_TO_FILE: "true",
      APP_LOG_FILE: "logs/test.log",
      APP_LOG_LEVEL: "debug",
    });

    const { logInfo } = await loadLogger();

    expect(() => logInfo("hello")).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
