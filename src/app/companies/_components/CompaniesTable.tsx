// src/app/companies/_components/CompaniesTable.tsx
import type { JSX } from "react";
import { labelForCountry } from "@/lib/enums";
import type { CompaniesTableProps } from "../types";

/**
 * Main results table for the "Top companies" listing.
 */
export function CompaniesTable(props: CompaniesTableProps): JSX.Element {
  const { items, page, pageSize } = props;

  return (
    <section className="mb-8">
      <div className="overflow-hidden rounded-xl border border-primary bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            role="table"
            aria-label="Companies with ghosting reports"
          >
            <thead className="border-b border-primary bg-muted">
              <tr>
                <th className="w-12 px-4 py-3 text-left text-xs font-medium text-secondary">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Country</th>
                <th className="w-24 px-4 py-3 text-right text-xs font-medium text-secondary">
                  Reports
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr
                  key={`${row.id}-${row.country}`}
                  className="border-b border-primary last:border-0 transition-colors hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 text-sm text-secondary">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-primary">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {labelForCountry(row.country)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-primary">{row.reportsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
