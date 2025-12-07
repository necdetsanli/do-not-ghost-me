import type { JSX } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type {
  CountryCode,
  JobLevel,
  PositionCategory,
  ReportStatus,
  Stage,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";
import {
  labelForCategory,
  labelForCountry,
  labelForJobLevel,
  labelForStage,
} from "@/lib/enums";
import { env } from "@/env";

export const dynamic = "force-dynamic";

/**
 * Minimal shape of a report row rendered in the admin table.
 * This is derived from Prisma's Report + Company relation.
 */
type AdminReportRow = {
  id: string;
  createdAt: Date;
  companyName: string;
  country: CountryCode;
  stage: Stage;
  jobLevel: JobLevel;
  positionCategory: PositionCategory;
  positionDetail: string;
  // Optional: some users may not remember how many days have passed.
  daysWithoutReply: number | null;
  status: ReportStatus;
  flaggedAt: Date | null;
  flaggedReason: string | null;
  deletedAt: Date | null;
};

/**
 * Format a Date instance into a compact, deterministic string
 * suitable for server-side rendering in the admin UI.
 *
 * Example output: "2025-01-05 14:23"
 */
function formatDateTime(dt: Date): string {
  return dt.toISOString().replace("T", " ").slice(0, 16);
}

/**
 * Human-readable label for a report's moderation status.
 */
function formatReportStatus(status: ReportStatus): string {
  if (status === "ACTIVE") {
    return "Active";
  }
  if (status === "FLAGGED") {
    return "Flagged";
  }
  // status === "DELETED"
  return "Deleted";
}

/**
 * Human-readable representation of the optional "days without reply" field.
 */
function formatDaysWithoutReply(value: number | null): string {
  if (typeof value === "number") {
    return String(value);
  }
  return "—";
}

/**
 * Fetch the latest reports for the admin dashboard.
 * We include basic company info and moderation metadata.
 */
async function fetchAdminReports(): Promise<AdminReportRow[]> {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      status: true,
      company: {
        select: {
          name: true,
        },
      },
      country: true,
      stage: true,
      jobLevel: true,
      positionCategory: true,
      positionDetail: true,
      daysWithoutReply: true,
      flaggedAt: true,
      flaggedReason: true,
      deletedAt: true,
    },
  });

  return reports.map((report) => ({
    id: report.id,
    createdAt: report.createdAt,
    status: report.status,
    companyName: report.company.name,
    country: report.country,
    stage: report.stage,
    jobLevel: report.jobLevel,
    positionCategory: report.positionCategory,
    positionDetail: report.positionDetail,
    daysWithoutReply: report.daysWithoutReply,
    flaggedAt: report.flaggedAt,
    flaggedReason: report.flaggedReason,
    deletedAt: report.deletedAt,
  }));
}

/**
 * Server-side admin dashboard page.
 *
 * Responsibilities:
 * - Enforce host restriction (ADMIN_ALLOWED_HOST) to avoid subdomain/subpath abuse.
 * - Verify the signed admin session cookie.
 * - Render a simple moderation table with basic actions:
 *   - Flag
 *   - Restore
 *   - Delete (soft-delete)
 * - Provide a secure logout button that clears the admin cookie.
 */
export default async function AdminPage(): Promise<JSX.Element> {
  // ---------------------------------------------------------------------------
  // 1) Host restriction: avoid accidental exposure on other hosts
  // ---------------------------------------------------------------------------
  const headersList = await headers();
  const hostHeader = headersList.get("host");
  const allowedHost = env.ADMIN_ALLOWED_HOST;

  if (allowedHost !== undefined && allowedHost !== "") {
    if (hostHeader !== allowedHost) {
      // If host is not allowed, treat this as a public surface and redirect away.
      redirect("/");
    }
  }

  // ---------------------------------------------------------------------------
  // 2) Admin session check via signed cookie
  // ---------------------------------------------------------------------------
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);
  const token = tokenCookie?.value ?? null;

  if (token === null || token === "") {
    redirect("/admin/login");
  }

  const session = verifyAdminSessionToken(token);

  if (session === null) {
    redirect("/admin/login");
  }

  // ---------------------------------------------------------------------------
  // 3) Load latest reports for moderation
  // ---------------------------------------------------------------------------
  const reports = await fetchAdminReports();
  const hasReports = reports.length > 0;

  // ---------------------------------------------------------------------------
  // 4) Render dashboard
  // ---------------------------------------------------------------------------
  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: "1120px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
            }}
          >
            Admin – Reports
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#4b5563",
            }}
          >
            Latest community reports (including flagged/deleted entries). Use
            the actions on the right to moderate.
          </p>
        </div>

        <form method="POST" action="/api/admin/logout">
          <button
            type="submit"
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </form>
      </header>

      {hasReports === false && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: "0.9rem",
            color: "#4b5563",
          }}
        >
          No reports have been submitted yet.
        </div>
      )}

      {hasReports === true && (
        <section>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  background: "#f3f4f6",
                }}
              >
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Created
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Company
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Country
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Stage</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Job level
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Category
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Position
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "0.5rem",
                    width: "4rem",
                  }}
                >
                  Days
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background:
                      report.status === "DELETED"
                        ? "#fef2f2"
                        : report.status === "FLAGGED"
                          ? "#fffbeb"
                          : "#ffffff",
                  }}
                >
                  <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                    {formatDateTime(report.createdAt)}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{report.companyName}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {labelForCountry(report.country)}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {labelForStage(report.stage)}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {labelForJobLevel(report.jobLevel)}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {labelForCategory(report.positionCategory)}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{report.positionDetail}</td>
                  <td
                    style={{
                      padding: "0.5rem",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDaysWithoutReply(report.daysWithoutReply)}
                  </td>
                  <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                    {formatReportStatus(report.status)}
                    {report.flaggedReason !== null &&
                      report.flaggedReason !== "" && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.75rem",
                            color: "#92400e",
                            marginTop: "0.15rem",
                          }}
                        >
                          Reason: {report.flaggedReason}
                        </span>
                      )}
                  </td>
                  <td style={{ padding: "0.5rem", whiteSpace: "nowrap" }}>
                    {(() => {
                      const isDeleted = report.status === "DELETED";
                      const isFlagged = report.status === "FLAGGED";

                      return (
                        <>
                          {/* Flag: only when not deleted */}
                          {isDeleted === false && (
                            <form
                              method="POST"
                              action={`/api/admin/reports/${report.id}`}
                              style={{ display: "inline" }}
                            >
                              <input type="hidden" name="action" value="flag" />
                              <button
                                type="submit"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#b45309",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  textDecoration: "underline",
                                  marginRight: "0.25rem",
                                }}
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
                              style={{ display: "inline" }}
                            >
                              <input
                                type="hidden"
                                name="action"
                                value="restore"
                              />
                              <button
                                type="submit"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#059669",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  textDecoration: "underline",
                                  marginRight: "0.25rem",
                                }}
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
                              style={{ display: "inline" }}
                            >
                              <input
                                type="hidden"
                                name="action"
                                value="delete"
                              />
                              <button
                                type="submit"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#b91c1c",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  textDecoration: "underline",
                                  marginRight: "0.25rem",
                                }}
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
                              style={{ display: "inline" }}
                            >
                              <input
                                type="hidden"
                                name="action"
                                value="hard-delete"
                              />
                              <button
                                type="submit"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#7f1d1d",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  textDecoration: "underline",
                                }}
                              >
                                Hard delete
                              </button>
                            </form>
                          )}
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
