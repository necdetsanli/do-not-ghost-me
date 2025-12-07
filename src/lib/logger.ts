// src/lib/logger.ts
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

// Enable/disable file logging via environment variables.
// These are intentionally read from process.env directly so that the logger
// stays decoupled from the stricter "@/env" schema.
const LOG_TO_FILE: boolean = process.env.APP_LOG_TO_FILE === "true";
const LOG_FILE_PATH: string = process.env.APP_LOG_FILE ?? "logs/app.log";

// Keep a single write stream per process for performance.
let fileStream: fs.WriteStream | null = null;

/**
 * Return true if the current environment looks like a server-side environment.
 * We never attempt file I/O in the browser.
 */
function isServerEnvironment(): boolean {
  return typeof window === "undefined";
}

/**
 * Lazily initialize the file write stream if file logging is enabled.
 * This function never throws: on any error it falls back to console-only logging.
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

/**
 * Render a safe JSON representation of the context.
 * We catch JSON errors so that logging never breaks the app.
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
 * Core logging function used by all level-specific helpers.
 * It always logs to console and optionally to a file.
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
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

/**
 * Public API: log at DEBUG level.
 */
export function logDebug(message: string, context?: LogContext): void {
  log("debug", message, context);
}

/**
 * Public API: log at INFO level.
 */
export function logInfo(message: string, context?: LogContext): void {
  log("info", message, context);
}

/**
 * Public API: log at WARN level.
 */
export function logWarn(message: string, context?: LogContext): void {
  log("warn", message, context);
}

/**
 * Public API: log at ERROR level.
 */
export function logError(message: string, context?: LogContext): void {
  log("error", message, context);
}
