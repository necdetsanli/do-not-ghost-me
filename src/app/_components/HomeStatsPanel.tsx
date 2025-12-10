// src/app/_components/HomeStatsPanel.tsx
"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

import { Card } from "@/components/Card";
import { StatsCard } from "@/components/StatsCard";

type StatsStatus = "idle" | "loading" | "success" | "error";

type MostReportedCompany = {
  name: string;
  reportCount: number;
};

type ReportsStatsApiResponse = {
  totalReports: number;
  mostReportedCompany?: MostReportedCompany | null;
};

/**
 * Validates that an unknown JSON value matches the expected report stats shape.
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

  if (
    raw.mostReportedCompany === undefined ||
    raw.mostReportedCompany === null
  ) {
    return true;
  }

  if (typeof raw.mostReportedCompany !== "object") {
    return false;
  }

  const company = raw.mostReportedCompany as {
    name?: unknown;
    reportCount?: unknown;
  };

  if (typeof company.name !== "string") {
    return false;
  }

  if (typeof company.reportCount !== "number") {
    return false;
  }

  return true;
}

/**
 * Stats panel for the home page.
 * Fetches aggregated stats from /api/reports/stats.
 */
export function HomeStatsPanel(): JSX.Element {
  const [stats, setStats] = useState<ReportsStatsApiResponse | null>(null);
  const [status, setStatus] = useState<StatsStatus>("idle");

  useEffect((): (() => void) => {
    let isSubscribed = true;

    async function loadStats(): Promise<void> {
      setStatus("loading");

      try {
        const res = await fetch("/api/reports/stats", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed to load stats: ${res.status}`);
        }

        const rawData: unknown = await res.json();

        if (!isValidReportsStatsResponse(rawData)) {
          throw new Error("Invalid stats response shape");
        }

        if (isSubscribed) {
          setStats(rawData);
          setStatus("success");
        }
      } catch (error) {
        if (!isSubscribed) {
          return;
        }

        // Client-side logging only; server-side logs are handled by API route
        console.error("[HomeStatsPanel] Failed to load stats", error);
        setStatus("error");
      }
    }

    void loadStats();

    return (): void => {
      isSubscribed = false;
    };
  }, []);

  const totalReportsLabel: string =
    stats !== null && typeof stats.totalReports === "number"
      ? stats.totalReports.toLocaleString()
      : status === "loading"
        ? "—"
        : "0";

  const mostCompanyName: string =
    stats?.mostReportedCompany?.name ??
    (status === "error" ? "Unavailable" : "No data yet");

  const mostCompanyCountLabel: string =
    stats?.mostReportedCompany?.reportCount !== undefined
      ? `${stats.mostReportedCompany.reportCount} reports`
      : status === "loading"
        ? "Loading..."
        : status === "error"
          ? "Data not available"
          : "No reports yet";

  return (
    <aside
      className="space-y-4"
      aria-label="Platform statistics"
      aria-busy={status === "loading"}
    >
      <StatsCard label="Total reports" value={totalReportsLabel} />

      <Card className="!p-6">
        <div className="flex items-start gap-3">
          <div
            className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30"
            aria-hidden="true"
          >
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-sm text-secondary">
              {status === "error"
                ? "Most reported company (unavailable)"
                : "Most reported this week"}
            </div>
            <div className="mb-1 text-xl text-primary" aria-live="polite">
              {mostCompanyName}
            </div>
            <div className="text-sm text-tertiary">{mostCompanyCountLabel}</div>
          </div>
        </div>
      </Card>
    </aside>
  );
}
