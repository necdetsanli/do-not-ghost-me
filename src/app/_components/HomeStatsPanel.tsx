// src/app/_components/HomeStatsPanel.tsx
"use client";

import type { JSX } from "react";
import { TrendingUp } from "lucide-react";

import { Card } from "@/components/Card";
import { StatsCard } from "@/components/StatsCard";
import { useReportsStats } from "@/app/_hooks/useReportsStats";
import { cn } from "@/components/ui/utils";

/**
 * Home page stats panel.
 *
 * Responsibilities:
 * - Render stats UI.
 * - Delegate fetching behavior to `useReportsStats` (SRP).
 *
 * NOTE:
 * - No polling is performed.
 * - Stats refresh only after a successful human report submission event.
 *
 * @returns The stats panel element.
 */
export function HomeStatsPanel(): JSX.Element {
  const { stats, status, isRefreshing, liveError } = useReportsStats();

  const totalReportsLabel: string =
    stats !== null ? stats.totalReports.toLocaleString() : status === "loading" ? "—" : "0";

  const mostCompanyName: string =
    stats?.mostReportedCompany?.name ?? (status === "error" ? "Unavailable" : "No data yet");

  const mostCompanyCountLabel: string =
    stats?.mostReportedCompany !== null && stats?.mostReportedCompany !== undefined
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
        ? "Most reported this week (refresh failed)"
        : "Most reported this week";

  return (
    <aside className={cn("space-y-4")} aria-label="Platform statistics" aria-busy={status === "loading"}>
      <div className={cn("flex items-center justify-between gap-3")}>
        <div className={cn("text-xs text-tertiary")} aria-live="polite">
          {isRefreshing === true ? "Updating…" : "Auto-updates after you submit"}
          {liveError === true ? " · Refresh failed" : null}
        </div>
      </div>

      <StatsCard label="Total reports" value={totalReportsLabel} />

      <Card className={cn("!p-6")}>
        <div className={cn("flex items-start gap-3")}>
          <div className={cn("rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30")} aria-hidden="true">
            <TrendingUp className={cn("h-5 w-5 text-indigo-600 dark:text-indigo-400")} />
          </div>
          <div className="flex-1">
            <div className={cn("mb-1 text-sm text-secondary")}>{subtitle}</div>
            <div className={cn("mb-1 text-xl text-primary")} aria-live="polite">
              {mostCompanyName}
            </div>
            <div className={cn("text-sm text-tertiary")}>{mostCompanyCountLabel}</div>
          </div>
        </div>
      </Card>
    </aside>
  );
}
