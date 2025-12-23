// tests/unit/logger.test.ts
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  ...fsMock,
}));

/**
 * Applies a partial set of environment variables for a test.
 *
 * - When a value is `undefined`, the variable is removed from process.env.
 * - Otherwise it is set as-is.
 *
 * @param vars - Key/value environment variables to apply.
 * @returns void
 */
function setEnv(vars: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

/**
 * Creates a minimal writable stream mock that behaves like a Node.js stream:
 * `.on()` is chainable and returns the same stream instance.
 *
 * @returns A stream mock implementing the subset used by the logger.
 */
function makeStream(): StreamMock {
  const stream: StreamMock = {
    destroyed: false,
    write: vi.fn(),
    on: vi.fn(),
  };

  stream.on.mockImplementation(() => stream);

  return stream;
}

/**
 * Loads the logger module fresh after resetting the module graph.
 *
 * This is important because logger initialization reads environment variables
 * and may initialize file streams at import time.
 *
 * @returns A promise resolving to the imported logger module.
 */
async function loadLogger(): Promise<typeof import("@/lib/logger")> {
  vi.resetModules();
  return import("@/lib/logger");
}

const originalEnv: Record<string, string | undefined> = { ...process.env };

/**
 * Unit tests for lib/logger.
 *
 * Focus areas:
 * - log level defaults & thresholds
 * - safe JSON context handling (including stringify failures)
 * - file logging behavior (server-only, opt-in, robust against failures)
 */
describe("lib/logger", () => {
  let consoleLogSpy!: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fsMock.existsSync.mockReset();
    fsMock.mkdirSync.mockReset();
    fsMock.createWriteStream.mockReset();

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    setEnv({
      APP_LOG_LEVEL: undefined,
      APP_LOG_TO_FILE: undefined,
      APP_LOG_FILE: undefined,
      NODE_ENV: "test",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore env back to original snapshot to avoid cross-test leakage.
    for (const key of Object.keys(process.env)) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key] as string;
      }
    }

    // Clean up browser-like global to keep tests isolated.
    if (Object.prototype.hasOwnProperty.call(globalThis as unknown as object, "window")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;
    }
  });

  /**
   * Verifies default threshold selection: in non-production environments,
   * the logger is permissive (debug enabled) when no explicit level is set.
   */
  it("defaults to debug level in non-production when APP_LOG_LEVEL is missing", async () => {
    setEnv({ NODE_ENV: "test", APP_LOG_LEVEL: undefined });

    const { logDebug } = await loadLogger();
    logDebug("hello");

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Verifies default threshold selection: in production environments,
   * the logger becomes stricter (debug disabled) when no explicit level is set.
   */
  it("defaults to info level in production when APP_LOG_LEVEL is missing", async () => {
    setEnv({ NODE_ENV: "production", APP_LOG_LEVEL: undefined });

    const { logDebug } = await loadLogger();
    logDebug("hello");

    expect(consoleLogSpy).toHaveBeenCalledTimes(0);
  });

  /**
   * Verifies the threshold filter: when level=warn,
   * info logs are dropped while warn logs are emitted.
   */
  it("honors APP_LOG_LEVEL threshold (warn drops info)", async () => {
    setEnv({ NODE_ENV: "test", APP_LOG_LEVEL: "warn" });

    const { logInfo, logWarn } = await loadLogger();

    logInfo("info");
    logWarn("warn");

    expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Ensures structured JSON context is appended when it can be stringified,
   * and that timestamps follow the expected ISO format.
   */
  it("includes JSON context when it can stringify", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const { logInfo } = await loadLogger();

    logInfo("hello", { a: 1 });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    const line = consoleLogSpy.mock.calls[0]?.[0];
    expect(String(line)).toContain("[2025-01-01T00:00:00.000Z]");
    expect(String(line)).toContain("hello");
    expect(String(line)).toContain('"a":1');

    vi.useRealTimers();
  });

  /**
   * Ensures the logger never throws if JSON context serialization fails,
   * e.g. due to circular references. It should fall back safely and emit
   * an error log for debugging visibility.
   */
  it("does not throw if context stringify fails (circular)", async () => {
    const { logInfo } = await loadLogger();

    const ctx: Record<string, unknown> = {};
    ctx.self = ctx;

    expect(() => logInfo("hello", ctx)).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  /**
   * Ensures file logging is disabled in browser-like environments.
   * When `window` exists, the logger must not attempt any fs operations.
   */
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

  /**
   * Ensures file logging works in server environments when enabled:
   * - creates parent directory when missing,
   * - initializes a write stream once,
   * - appends log lines to the stream.
   */
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

  /**
   * Ensures robustness: if file stream initialization throws,
   * the logger must not crash the application and should emit an error log.
   */
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
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  /**
   * Ensures the logger uses info level as default in production when
   * APP_LOG_LEVEL is set to an invalid value.
   */
  it("falls back to info in production when APP_LOG_LEVEL is invalid", async () => {
    setEnv({ NODE_ENV: "production", APP_LOG_LEVEL: "invalid_level" });

    const { logDebug, logInfo } = await loadLogger();

    logDebug("debug message");
    expect(consoleLogSpy).toHaveBeenCalledTimes(0);

    logInfo("info message");
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Ensures the logger falls back to debug level in non-production when
   * APP_LOG_LEVEL is set to an invalid value.
   */
  it("falls back to debug in non-production when APP_LOG_LEVEL is invalid", async () => {
    setEnv({ NODE_ENV: "test", APP_LOG_LEVEL: "not_a_level" });

    const { logDebug } = await loadLogger();

    logDebug("debug message");
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Ensures error-level logs are routed to console.error.
   */
  it("routes error logs to console.error", async () => {
    setEnv({ NODE_ENV: "test", APP_LOG_LEVEL: "debug" });

    const { logError } = await loadLogger();

    logError("error message");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledTimes(0);
  });

  /**
   * Ensures file stream write errors are caught and logged without throwing.
   */
  it("catches file stream write errors without throwing", async () => {
    const stream = makeStream();
    stream.write.mockImplementation(() => {
      throw new Error("write failed");
    });
    fsMock.existsSync.mockReturnValue(true);
    fsMock.createWriteStream.mockReturnValue(stream);

    setEnv({
      APP_LOG_TO_FILE: "true",
      APP_LOG_FILE: "logs/test.log",
      APP_LOG_LEVEL: "debug",
    });

    const { logInfo } = await loadLogger();

    expect(() => logInfo("hello")).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  /**
   * Ensures the directory is not recreated if it already exists.
   */
  it("does not recreate directory if it already exists", async () => {
    const stream = makeStream();
    fsMock.existsSync.mockReturnValue(true);
    fsMock.createWriteStream.mockReturnValue(stream);

    setEnv({
      APP_LOG_TO_FILE: "true",
      APP_LOG_FILE: "logs/test.log",
      APP_LOG_LEVEL: "debug",
    });

    const { logInfo } = await loadLogger();

    logInfo("hello");

    expect(fsMock.mkdirSync).toHaveBeenCalledTimes(0);
    expect(fsMock.createWriteStream).toHaveBeenCalledTimes(1);
  });

  /**
   * Ensures that when stream.on("error") is called, it logs to console.error without throwing.
   */
  it("handles file stream error events gracefully", async () => {
    const stream = makeStream();
    let errorCallback: ((err: Error) => void) | undefined;

    // Capture the error callback when it's registered
    stream.on.mockImplementation((event: string, cb: (err: Error) => void) => {
      if (event === "error") {
        errorCallback = cb;
      }
      return stream;
    });

    fsMock.existsSync.mockReturnValue(true);
    fsMock.createWriteStream.mockReturnValue(stream);

    setEnv({
      APP_LOG_TO_FILE: "true",
      APP_LOG_FILE: "logs/test.log",
      APP_LOG_LEVEL: "debug",
    });

    const { logInfo } = await loadLogger();
    logInfo("hello");

    // Now trigger the error callback
    expect(errorCallback).toBeDefined();
    errorCallback!(new Error("stream write error"));

    // The error should be logged to console.error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[LOGGER] Failed to write to log file",
      "stream write error",
    );
  });

  describe("correlation id (planned behavior)", () => {
    it.todo("generates a server-side UUID correlationId when header is absent");
    it.todo(
      "accepts an incoming correlationId header only if it matches strict format/length, otherwise generates a new one",
    );
    it.todo("echoes correlationId in response headers and includes it in structured log context");
  });
});
