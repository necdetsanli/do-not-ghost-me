//src/components/StatsCard.tsx
import type { JSX } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
}

export function StatsCard({
  label,
  value,
  trend,
}: StatsCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-primary bg-surface p-6">
      <div className="mb-2 text-sm text-secondary">{label}</div>
      <div className="flex items-end gap-3">
        <div className="text-3xl text-primary">{value}</div>
        {trend !== undefined && (
          <div className="mb-1 text-sm text-tertiary">{trend}</div>
        )}
      </div>
    </div>
  );
}
