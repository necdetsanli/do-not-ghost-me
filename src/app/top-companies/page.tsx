// src/app/top-companies/page.tsx
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIN_REPORTS = 1; // you can raise this later (e.g. 3)
const LIMIT = 50;

type TopCompany = {
  id: string;
  name: string;
  country: string | null;
  reportCount: number;
};

async function getTopCompanies(): Promise<{
  items: TopCompany[];
  totalReports: number;
}> {
  // Group reports by companyId and count them
  const grouped = await prisma.report.groupBy({
    by: ["companyId"],
    _count: {
      _all: true,
    },
    // Sort by number of reports (using "id" as representative field)
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: LIMIT,
  });

  if (grouped.length === 0) {
    return { items: [], totalReports: 0 };
  }

  // Apply MIN_REPORTS filter in application code
  const filtered = grouped.filter((g) => g._count._all >= MIN_REPORTS);

  if (filtered.length === 0) {
    return { items: [], totalReports: 0 };
  }

  const companyIds = filtered.map((g) => g.companyId);

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: {
      id: true,
      name: true,
      country: true,
    },
  });

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const items: TopCompany[] = [];

  for (const g of filtered) {
    const company = companyMap.get(g.companyId);
    if (!company) {
      // Should not happen because of FK, but we guard anyway
      continue;
    }

    items.push({
      id: company.id,
      name: company.name,
      country: company.country ?? null,
      reportCount: g._count._all,
    });
  }

  const totalReports = filtered.reduce(
    (acc, g) => acc + g._count._all,
    0,
  );

  return { items, totalReports };
}

export default async function TopCompaniesPage() {
  const { items, totalReports } = await getTopCompanies();

  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Top ghosted companies
      </h1>
      <p style={{ marginBottom: "1.5rem", color: "#4b5563" }}>
        This list is based on anonymous reports from candidates who were
        ghosted by companies during the hiring process. It is not a
        scientific ranking, just a community signal.
      </p>

      {items.length === 0 ? (
        <p>No reports yet. Be the first to submit one on the home page.</p>
      ) : (
        <>
          <p style={{ marginBottom: "0.75rem", color: "#4b5563" }}>
            Showing up to {items.length} companies. Total reports in this
            list: <strong>{totalReports}</strong>.
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95rem",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f3f4f6",
                }}
              >
                <th style={{ padding: "0.5rem" }}>#</th>
                <th style={{ padding: "0.5rem" }}>Company</th>
                <th style={{ padding: "0.5rem" }}>Country</th>
                <th style={{ padding: "0.5rem" }}>Reports</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <td style={{ padding: "0.5rem", width: "3rem" }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{item.name}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {item.country ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      fontWeight: 600,
                    }}
                  >
                    {item.reportCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
