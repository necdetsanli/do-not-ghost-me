// src/app/_hooks/useReportsStats.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
   * True while an event-triggered refresh is in-flight.
   */
  isRefreshing: boolean;

  /**
   * True when a refresh fails after an initial successful load.
   */
  liveError: boolean;

  /**
   * Triggers an immediate refresh (best-effort).
   *
   * @returns A promise that resolves when the refresh attempt completes.
   */
  refreshNow: () => Promise<void>;
};

/** Custom DOM event name dispatched after a successful report submission. */
const REPORT_SUBMITTED_EVENT_NAME: string = "dngm:report-submitted";

/**
 * Minimum time between automatic refreshes triggered by focus/visibility/pageshow
 * to avoid spamming the stats endpoint during rapid navigations.
 */
const AUTO_REFRESH_THROTTLE_MS: number = 2_000;

/**
 * Module-level cache of the last known stats to avoid showing "0 / No data yet"
 * during client-side navigations before the first fetch completes.
 */
let cachedStats: ReportsStatsApiResponse | null = null;

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
 * Loads /api/reports/stats and keeps the latest stats in state.
 *
 * Behavior:
 * - Performs an initial fetch on mount.
 * - Refreshes on:
 *   - successful report submission event
 *   - window focus / document visibility change / pageshow (back-forward cache)
 * - Does NOT poll on an interval.
 *
 * @returns Stats state and controls for the caller UI.
 */
export function useReportsStats(): UseReportsStatsResult {
  const [stats, setStats] = useState<ReportsStatsApiResponse | null>(
    () => cachedStats,
  );
  const [status, setStatus] = useState<StatsStatus>(() =>
    cachedStats !== null ? "success" : "loading",
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const hasEverLoadedRef = useRef<boolean>(cachedStats !== null);
  const lastAutoRefreshAtMsRef = useRef<number>(0);

  /**
   * Builds a cache-busted stats URL to reduce the chance of stale intermediaries
   * returning an outdated response after client-side navigations.
   *
   * @returns Absolute URL string for /api/reports/stats.
   */
  const buildStatsUrl = useCallback((): string => {
    const url = new URL("/api/reports/stats", window.location.origin);
    url.searchParams.set("_ts", String(Date.now()));
    return url.toString();
  }, []);

  /**
   * Fetches stats once.
   *
   * @param isInitial - True if this fetch is the initial load.
   * @returns A promise that resolves when the fetch attempt completes.
   */
  const fetchOnce = useCallback(
    async (isInitial: boolean): Promise<void> => {
      if (inFlightRef.current === true) {
        return;
      }

      inFlightRef.current = true;

      if (isInitial === true && hasEverLoadedRef.current === false) {
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
        const res = await fetch(buildStatsUrl(), {
          method: "GET",
          headers: {
            accept: "application/json",
            "cache-control": "no-store",
          },
          signal: controller.signal,
          cache: "no-store",
        });

        if (res.ok !== true) {
          throw new Error(`stats-http-${res.status}`);
        }

        const rawUnknown: unknown = await res.json();

        if (isValidReportsStatsResponse(rawUnknown) !== true) {
          throw new Error("stats-shape-invalid");
        }

        const nextStats: ReportsStatsApiResponse = rawUnknown;

        cachedStats = nextStats;
        hasEverLoadedRef.current = true;

        setLiveError(false);
        setStats((prev) => {
          if (prev === null) {
            return nextStats;
          }
          if (statsEqual(prev, nextStats) === true) {
            return prev;
          }
          return nextStats;
        });

        setStatus("success");
      } catch (err: unknown) {
        const aborted: boolean =
          err instanceof DOMException && err.name === "AbortError";

        if (aborted !== true) {
          if (hasEverLoadedRef.current === false) {
            setStatus("error");
          } else {
            setLiveError(true);
          }
        }
      } finally {
        setIsRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [buildStatsUrl],
  );

  /**
   * Triggers an immediate background refresh.
   *
   * @returns A promise that resolves when the refresh attempt completes.
   */
  const refreshNow = useCallback(async (): Promise<void> => {
    await fetchOnce(false);
  }, [fetchOnce]);

  useEffect(() => {
    /**
     * Refresh trigger dispatched after successful report submission.
     */
    const onReportSubmitted = (): void => {
      void fetchOnce(false);
    };

    /**
     * Refresh on tab focus / visibility / bfcache restore so the home stats
     * are up-to-date even after client-side navigations.
     */
    const onAutoRefreshSignal = (): void => {
      const nowMs: number = Date.now();
      const deltaMs: number = nowMs - lastAutoRefreshAtMsRef.current;

      if (deltaMs < AUTO_REFRESH_THROTTLE_MS) {
        return;
      }

      lastAutoRefreshAtMsRef.current = nowMs;
      void fetchOnce(false);
    };

    /**
     * Refresh only when the document becomes visible.
     */
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        onAutoRefreshSignal();
      }
    };

    window.addEventListener(
      REPORT_SUBMITTED_EVENT_NAME,
      onReportSubmitted as EventListener,
    );

    window.addEventListener("focus", onAutoRefreshSignal);
    window.addEventListener("pageshow", onAutoRefreshSignal);
    document.addEventListener("visibilitychange", onVisibilityChange);

    void fetchOnce(true);

    return () => {
      window.removeEventListener(
        REPORT_SUBMITTED_EVENT_NAME,
        onReportSubmitted as EventListener,
      );

      window.removeEventListener("focus", onAutoRefreshSignal);
      window.removeEventListener("pageshow", onAutoRefreshSignal);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (abortRef.current !== null) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [fetchOnce]);

  return { stats, status, isRefreshing, liveError, refreshNow };
}
