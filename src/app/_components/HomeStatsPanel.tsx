// src/app/_components/HomeStatsPanel.tsx
"use client";

import type { JSX } from "react";
import { TrendingUp } from "lucide-react";

import { Card } from "@/components/Card";
import { StatsCard } from "@/components/StatsCard";
import { useReportsStats } from "@/app/_hooks/useReportsStats";

/**
 * Home page stats panel.
 *
 * Responsibilities:
 * - Render stats UI.
 * - Delegate all fetching/polling behavior to `useReportsStats` (SRP).
 *
 * @returns The stats panel element.
 */
export function HomeStatsPanel(): JSX.Element {
  const { stats, status, isRefreshing, liveError } = useReportsStats({
    pollIntervalMs: 20_000,
  });

  const totalReportsLabel: string =
    stats !== null
      ? stats.totalReports.toLocaleString()
      : status === "loading"
        ? "—"
        : "0";

  const mostCompanyName: string =
    stats?.mostReportedCompany?.name ??
    (status === "error" ? "Unavailable" : "No data yet");

  const mostCompanyCountLabel: string =
    stats?.mostReportedCompany !== null &&
    stats?.mostReportedCompany !== undefined
      ? `${stats.mostReportedCompany.reportCount} reports`
      : status === "loading"
        ? "Loading..."
        : status === "error"
          ? "Data not available"
          : "No reports yet";

  const subtitle: string =
    status === "error"
      ? "Most reported company (unavailable)"
      : liveError === true
        ? "Most reported this week (offline)"
        : "Most reported this week";

  return (
    <aside
      className="space-y-4"
      aria-label="Platform statistics"
      aria-busy={status === "loading"}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-tertiary">
          <span className="inline-flex items-center gap-2" aria-live="polite">
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse bg-foreground/70"
              aria-hidden="true"
            />
            <span>Live</span>
            {isRefreshing === true ? <span>Updating…</span> : null}
            {liveError === true ? <span>Offline</span> : null}
          </span>
        </div>
      </div>

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
            <div className="mb-1 text-sm text-secondary">{subtitle}</div>
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
