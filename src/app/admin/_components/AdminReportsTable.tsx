// src/app/admin/_components/AdminReportsTable.tsx
import type { JSX } from "react";

import {
  labelForCategory,
  labelForCountry,
  labelForJobLevel,
  labelForStage,
} from "@/lib/enums";
import type { AdminReportRow } from "@/app/admin/_lib/adminTypes";
import {
  formatDateTime,
  formatDaysWithoutReply,
  formatReportStatus,
} from "@/app/admin/_lib/adminFormatters";

export interface AdminReportsTableProps {
  reports: AdminReportRow[];
}

/**
 * Main moderation table for admin reports.
 * Renders rows with status styling and action forms.
 */
export function AdminReportsTable(props: AdminReportsTableProps): JSX.Element {
  const { reports } = props;

  return (
    <div className="overflow-hidden rounded-xl border border-primary bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full text-xs md:text-sm"
          role="table"
          aria-label="Admin reports moderation table"
        >
          <thead className="border-b border-primary bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary md:px-6">
                Created
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary md:px-6">
                Company
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">
                Country
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">
                Job level
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">
                Category
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">
                Position
              </th>
              <th className="w-14 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-secondary">
                Days
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-secondary">
                Status
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-secondary md:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const baseRowClass =
                "border-b border-primary last:border-0 hover:bg-surface-hover transition-colors";
              const statusRowClass =
                report.status === "DELETED"
                  ? "bg-red-50 dark:bg-red-950/20"
                  : report.status === "FLAGGED"
                    ? "bg-yellow-50 dark:bg-yellow-950/20"
                    : "bg-surface";

              const statusBadgeClass =
                report.status === "ACTIVE"
                  ? "badge-active"
                  : report.status === "FLAGGED"
                    ? "badge-flagged"
                    : "badge-deleted";

              const isDeleted = report.status === "DELETED";
              const isFlagged = report.status === "FLAGGED";

              return (
                <tr
                  key={report.id}
                  className={`${baseRowClass} ${statusRowClass}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-secondary md:px-6">
                    {formatDateTime(report.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-primary md:px-6">
                    {report.companyName}
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    {labelForCountry(report.country)}
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    {labelForStage(report.stage)}
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    {labelForJobLevel(report.jobLevel)}
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    {labelForCategory(report.positionCategory)}
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    {report.positionDetail}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-secondary">
                    {formatDaysWithoutReply(report.daysWithoutReply)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border border-primary px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass}`}
                    >
                      {formatReportStatus(report.status)}
                    </span>
                    {report.flaggedReason !== null &&
                      report.flaggedReason !== "" && (
                        <span className="mt-1 block text-[11px] text-amber-700">
                          Reason: {report.flaggedReason}
                        </span>
                      )}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] md:px-6">
                    {/* Flag: only when not deleted */}
                    {isDeleted === false && (
                      <form
                        method="POST"
                        action={`/api/admin/reports/${report.id}`}
                        className="inline"
                      >
                        <input type="hidden" name="action" value="flag" />
                        <button
                          type="submit"
                          className="mr-2 inline-flex items-center text-[11px] font-medium text-amber-700 underline hover:text-amber-800"
                        >
                          Flag
                        </button>
                      </form>
                    )}

                    {/* Restore: available for FLAGGED or DELETED */}
                    {(isFlagged === true || isDeleted === true) && (
                      <form
                        method="POST"
                        action={`/api/admin/reports/${report.id}`}
                        className="inline"
                      >
                        <input type="hidden" name="action" value="restore" />
                        <button
                          type="submit"
                          className="mr-2 inline-flex items-center text-[11px] font-medium text-emerald-700 underline hover:text-emerald-800"
                        >
                          Restore
                        </button>
                      </form>
                    )}

                    {/* Soft delete: hide from public stats, keep for audit. */}
                    {isDeleted === false && (
                      <form
                        method="POST"
                        action={`/api/admin/reports/${report.id}`}
                        className="inline"
                      >
                        <input type="hidden" name="action" value="delete" />
                        <button
                          type="submit"
                          className="mr-2 inline-flex items-center text-[11px] font-medium text-red-700 underline hover:text-red-800"
                        >
                          Soft delete
                        </button>
                      </form>
                    )}

                    {/* Hard delete: only available once it's soft-deleted. */}
                    {isDeleted === true && (
                      <form
                        method="POST"
                        action={`/api/admin/reports/${report.id}`}
                        className="inline"
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="hard-delete"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center text-[11px] font-medium text-red-900 underline hover:text-red-950"
                        >
                          Hard delete
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
