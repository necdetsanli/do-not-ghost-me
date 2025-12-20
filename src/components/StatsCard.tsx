// src/components/StatsCard.tsx
import type { JSX } from "react";
import { Card } from "@/components/Card";

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
}

/**
 * Compact statistics card used for dashboard-style metrics.
 */
export function StatsCard({ label, value, trend }: StatsCardProps): JSX.Element {
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-tertiary">{label}</div>

      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <div className="text-2xl font-semibold leading-tight text-primary sm:text-3xl">{value}</div>

        {trend !== undefined && (
          <div className="mb-0.5 text-xs text-tertiary sm:text-sm">{trend}</div>
        )}
      </div>
    </Card>
  );
}
