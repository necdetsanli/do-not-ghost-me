// src/lib/logger.ts
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

// -----------------------------------------------------------------------------
// Environment-driven configuration
// -----------------------------------------------------------------------------

/**
 * Ordered list of log levels from least to most severe.
 */
const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

/**
 * Parse a string into a valid LogLevel, or fall back to a safe default.
 *
 * @param value - Raw string value from environment.
 * @returns A valid log level name.
 */
function parseLogLevel(value: string | undefined): LogLevel {
  if (value === undefined) {
    return process.env.NODE_ENV === "production" ? "info" : "debug";
  }

  const lower = value.toLowerCase();

  if (LOG_LEVELS.includes(lower as LogLevel)) {
    return lower as LogLevel;
  }

  // Fallback if someone misconfigures APP_LOG_LEVEL.
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Active log level threshold. Messages below this level are dropped.
 *
 * Example:
 * - APP_LOG_LEVEL=warn  → only "warn" and "error" are logged.
 * - APP_LOG_LEVEL=debug → all messages are logged.
 */
const ACTIVE_LOG_LEVEL: LogLevel = parseLogLevel(process.env.APP_LOG_LEVEL);

// Enable/disable file logging via environment variables.
// These are intentionally read from process.env directly so that the logger
// stays decoupled from the stricter "@/env" schema.
const LOG_TO_FILE: boolean = process.env.APP_LOG_TO_FILE === "true";
const LOG_FILE_PATH: string = process.env.APP_LOG_FILE ?? "logs/app.log";

// Keep a single write stream per process for performance.
let fileStream: fs.WriteStream | null = null;

// -----------------------------------------------------------------------------
// Environment helpers
// -----------------------------------------------------------------------------

/**
 * Return true if the current environment looks like a server-side environment.
 * We never attempt file I/O in the browser.
 *
 * Note: This assumes runtime provides `window` only in browser-like contexts.
 */
function isServerEnvironment(): boolean {
  // In Node.js there is no global `window`; in the browser there is.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return typeof window === "undefined";
}

// -----------------------------------------------------------------------------
// File stream management
// -----------------------------------------------------------------------------

/**
 * Lazily initialize the file write stream if file logging is enabled.
 * This function never throws: on any error it falls back to console-only logging.
 *
 * @returns An fs.WriteStream instance or null if file logging is disabled/unavailable.
 */
function getFileStream(): fs.WriteStream | null {
  if (!isServerEnvironment()) {
    return null;
  }

  if (!LOG_TO_FILE) {
    return null;
  }

  if (fileStream !== null && !fileStream.destroyed) {
    return fileStream;
  }

  try {
    const resolvedPath = path.resolve(LOG_FILE_PATH);
    const dir = path.dirname(resolvedPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(resolvedPath, {
      flags: "a",
      encoding: "utf8",
    });

    stream.on("error", (err: unknown) => {
      // We must never throw from the logger.
      console.error(
        "[LOGGER] Failed to write to log file",
        err instanceof Error ? err.message : err,
      );
    });

    fileStream = stream;
    return fileStream;
  } catch (err: unknown) {
    console.error(
      "[LOGGER] Failed to initialize log file stream",
      err instanceof Error ? err.message : err,
    );
    fileStream = null;
    return null;
  }
}

// -----------------------------------------------------------------------------
// Formatting helpers
// -----------------------------------------------------------------------------

/**
 * Render a safe JSON representation of the context.
 * We catch JSON errors so that logging never breaks the app.
 *
 * @param context - Optional key/value metadata to attach to the log entry.
 * @returns A stringified representation prefixed with a space, or an empty string.
 */
function formatContext(context?: LogContext): string {
  if (context == null || Object.keys(context).length === 0) {
    return "";
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch (err: unknown) {
    console.error(
      "[LOGGER] Failed to JSON.stringify log context",
      err instanceof Error ? err.message : err,
    );
    return "";
  }
}

/**
 * Determine whether a given log level should be emitted under the current
 * ACTIVE_LOG_LEVEL threshold.
 *
 * @param level - Log level for the current log entry.
 * @returns True if the message should be logged, false if it should be skipped.
 */
function shouldLog(level: LogLevel): boolean {
  const currentIndex = LOG_LEVELS.indexOf(level);
  const thresholdIndex = LOG_LEVELS.indexOf(ACTIVE_LOG_LEVEL);

  if (currentIndex === -1 || thresholdIndex === -1) {
    // Should never happen, but fail open (log) rather than silently dropping.
    return true;
  }

  return currentIndex >= thresholdIndex;
}

// -----------------------------------------------------------------------------
// Core logger
// -----------------------------------------------------------------------------

/**
 * Core logging function used by all level-specific helpers.
 * It always logs to console (subject to log-level threshold) and
 * optionally to a file when enabled.
 *
 * @param level - Severity level of the log entry.
 * @param message - Human-readable message describing the event.
 * @param context - Optional structured metadata for debugging and tracing.
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp: string = new Date().toISOString();
  const upperLevel: string = level.toUpperCase();
  const suffix: string = formatContext(context);

  const line: string = `[${timestamp}] [${upperLevel}] ${message}${suffix}`;

  // Console logging: this is the primary sink for most deployments.
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }

  // Optional file logging for environments where it makes sense.
  const stream = getFileStream();
  if (stream !== null) {
    try {
      // Fire-and-forget; we do not await the drain event.
      stream.write(`${line}\n`);
    } catch (err: unknown) {
      console.error(
        "[LOGGER] Failed to write to log file",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Log at DEBUG level.
 *
 * @param message - Human-readable message describing the event.
 * @param context - Optional structured metadata for debugging.
 */
export function logDebug(message: string, context?: LogContext): void {
  log("debug", message, context);
}

/**
 * Log at INFO level.
 *
 * @param message - Human-readable message describing the event.
 * @param context - Optional structured metadata for debugging.
 */
export function logInfo(message: string, context?: LogContext): void {
  log("info", message, context);
}

/**
 * Log at WARN level.
 *
 * @param message - Human-readable message describing the event.
 * @param context - Optional structured metadata for debugging.
 */
export function logWarn(message: string, context?: LogContext): void {
  log("warn", message, context);
}

/**
 * Log at ERROR level.
 *
 * @param message - Human-readable message describing the event.
 * @param context - Optional structured metadata for debugging.
 */
export function logError(message: string, context?: LogContext): void {
  log("error", message, context);
}
