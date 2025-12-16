// src/app/_hooks/useReportsStats.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Load state for the stats resource.
 */
export type StatsStatus = "idle" | "loading" | "success" | "error";

/**
 * Most reported company payload for the current UTC week.
 */
export type MostReportedCompany = {
  /**
   * Company display name.
   */
  name: string;

  /**
   * Number of ACTIVE reports for the company in the current UTC week.
   */
  reportCount: number;
};

/**
 * Response shape returned by GET /api/reports/stats.
 */
export type ReportsStatsApiResponse = {
  /**
   * Total number of ACTIVE reports across all time.
   */
  totalReports: number;

  /**
   * Most reported company this week or null when no data exists.
   */
  mostReportedCompany: MostReportedCompany | null;
};

/**
 * Hook configuration options.
 */
type UseReportsStatsArgs = {
  /**
   * Poll interval in milliseconds for background refresh.
   * The interval is clamped to a safe minimum to protect the server.
   */
  pollIntervalMs?: number;
};

/**
 * Hook result contract.
 */
type UseReportsStatsResult = {
  /**
   * Latest known stats or null if not loaded yet.
   */
  stats: ReportsStatsApiResponse | null;

  /**
   * Initial load status.
   */
  status: StatsStatus;

  /**
   * True while a background refresh is in-flight.
   */
  isRefreshing: boolean;

  /**
   * True when a background refresh fails after an initial successful load.
   */
  liveError: boolean;

  /**
   * Triggers an immediate refresh (best-effort).
   *
   * @returns A promise that resolves when the refresh attempt completes.
   */
  refreshNow: () => Promise<void>;
};

const DEFAULT_POLL_INTERVAL_MS: number = 20_000;
const MIN_POLL_INTERVAL_MS: number = 5_000;

/**
 * Clamps the poll interval to a conservative minimum to avoid aggressive polling.
 *
 * @param value - Proposed interval in milliseconds.
 * @returns A safe polling interval.
 */
function clampPollIntervalMs(value: number): number {
  if (Number.isFinite(value) !== true) {
    return DEFAULT_POLL_INTERVAL_MS;
  }
  if (value < MIN_POLL_INTERVAL_MS) {
    return MIN_POLL_INTERVAL_MS;
  }
  return value;
}

/**
 * Runtime validator for the stats API response.
 *
 * @param value - Unknown JSON value.
 * @returns True if the payload matches the expected shape.
 */
function isValidReportsStatsResponse(
  value: unknown,
): value is ReportsStatsApiResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const raw = value as {
    totalReports?: unknown;
    mostReportedCompany?: unknown;
  };

  if (typeof raw.totalReports !== "number") {
    return false;
  }

  if (raw.mostReportedCompany === null) {
    return true;
  }

  if (raw.mostReportedCompany === undefined) {
    return false;
  }

  if (
    typeof raw.mostReportedCompany !== "object" ||
    raw.mostReportedCompany === null
  ) {
    return false;
  }

  const company = raw.mostReportedCompany as {
    name?: unknown;
    reportCount?: unknown;
  };

  return (
    typeof company.name === "string" && typeof company.reportCount === "number"
  );
}

/**
 * Compares two stats snapshots for equality.
 *
 * @param a - Previous stats.
 * @param b - Next stats.
 * @returns True if both snapshots represent the same values.
 */
function statsEqual(
  a: ReportsStatsApiResponse,
  b: ReportsStatsApiResponse,
): boolean {
  if (a.totalReports !== b.totalReports) {
    return false;
  }

  if (a.mostReportedCompany === null && b.mostReportedCompany === null) {
    return true;
  }

  if (a.mostReportedCompany === null || b.mostReportedCompany === null) {
    return false;
  }

  return (
    a.mostReportedCompany.name === b.mostReportedCompany.name &&
    a.mostReportedCompany.reportCount === b.mostReportedCompany.reportCount
  );
}

/**
 * Polls /api/reports/stats and keeps the latest stats in state.
 *
 * Behavior:
 * - Performs an initial fetch on mount.
 * - Polls every N milliseconds while the tab is visible.
 * - Stops polling when the tab is hidden.
 * - Revalidates on window focus.
 * - Supports an optional immediate refresh via the "dngm:report-submitted" event.
 *
 * @param args - Hook configuration.
 * @returns Stats state and controls for the caller UI.
 */
export function useReportsStats(
  args?: UseReportsStatsArgs,
): UseReportsStatsResult {
  const pollIntervalMs: number = useMemo(() => {
    const raw = args?.pollIntervalMs;
    if (typeof raw !== "number") {
      return DEFAULT_POLL_INTERVAL_MS;
    }
    return clampPollIntervalMs(raw);
  }, [args?.pollIntervalMs]);

  const [stats, setStats] = useState<ReportsStatsApiResponse | null>(null);
  const [status, setStatus] = useState<StatsStatus>("idle");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<boolean>(false);

  const intervalRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<boolean>(false);

  /**
   * Clears the active poll timer if present.
   */
  const clearTimer = useCallback((): void => {
    const id = intervalRef.current;
    if (id !== null) {
      window.clearInterval(id);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Fetches stats once. When called during initial load it sets `status=loading`,
   * otherwise it toggles `isRefreshing`.
   *
   * @param isInitial - True if this fetch is the initial load.
   * @returns A promise that resolves when the fetch attempt completes.
   */
  const fetchOnce = useCallback(async (isInitial: boolean): Promise<void> => {
    if (inFlightRef.current === true) {
      return;
    }

    inFlightRef.current = true;

    if (isInitial === true) {
      setStatus("loading");
    } else {
      setIsRefreshing(true);
    }

    if (abortRef.current !== null) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/reports/stats", {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
      });

      if (res.ok !== true) {
        throw new Error(`stats-http-${res.status}`);
      }

      const raw: unknown = await res.json();

      if (isValidReportsStatsResponse(raw) !== true) {
        throw new Error("stats-shape-invalid");
      }

      setLiveError(false);

      setStats((prev) => {
        if (prev === null) {
          return raw;
        }
        if (statsEqual(prev, raw) === true) {
          return prev;
        }
        return raw;
      });

      setStatus("success");
    } catch (err: unknown) {
      const aborted: boolean =
        err instanceof DOMException && err.name === "AbortError";

      if (aborted !== true) {
        if (isInitial === true) {
          setStatus("error");
        } else {
          setLiveError(true);
        }
      }
    } finally {
      setIsRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  /**
   * Triggers an immediate background refresh.
   *
   * @returns A promise that resolves when the refresh attempt completes.
   */
  const refreshNow = useCallback(async (): Promise<void> => {
    await fetchOnce(false);
  }, [fetchOnce]);

  /**
   * Starts polling if the document is visible. If already running, restarts it.
   */
  const startTimer = useCallback((): void => {
    if (document.hidden === true) {
      return;
    }

    clearTimer();

    const id: number = window.setInterval(() => {
      if (document.hidden === true) {
        return;
      }
      void fetchOnce(false);
    }, pollIntervalMs);

    intervalRef.current = id;
  }, [clearTimer, fetchOnce, pollIntervalMs]);

  useEffect(() => {
    /**
     * Handles visibility changes to stop polling when hidden and revalidate on show.
     */
    const onVisibilityChange = (): void => {
      if (document.hidden === true) {
        clearTimer();
        return;
      }

      void fetchOnce(false);
      startTimer();
    };

    /**
     * Revalidates on window focus for a snappier "live" feeling.
     */
    const onFocus = (): void => {
      void fetchOnce(false);
    };

    /**
     * Refresh trigger dispatched after successful report submission.
     */
    const onReportSubmitted = (): void => {
      void fetchOnce(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener(
      "dngm:report-submitted",
      onReportSubmitted as EventListener,
    );

    void fetchOnce(true);
    startTimer();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(
        "dngm:report-submitted",
        onReportSubmitted as EventListener,
      );

      clearTimer();

      if (abortRef.current !== null) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [clearTimer, fetchOnce, startTimer]);

  return { stats, status, isRefreshing, liveError, refreshNow };
}
