// src/app/companies/page.tsx
import type { JSX } from "react";
import type { Metadata, Viewport } from "next";

import { CompaniesActiveFilters } from "./_components/CompaniesActiveFilters";
import { CompaniesFilterForm } from "./_components/CompaniesFilterForm";
import { CompaniesPagination } from "./_components/CompaniesPagination";
import { CompaniesResultSummary } from "./_components/CompaniesResultSummary";
import { CompaniesTable } from "./_components/CompaniesTable";
import type { SearchParams } from "./types";
import { parseFilters } from "./_lib/filters";
import { getCompaniesPage } from "./_lib/data";
import { buildPageUrl } from "./_lib/url";
import { PAGE_SIZE } from "./_lib/constants";

export const dynamic = "force-dynamic";

const TITLE = "Companies";
const DESCRIPTION =
  "Companies ranked by the number of ghosting reports submitted by job seekers. Filter by country, role category, job level and interview stage.";

const SITE_URL = "https://www.donotghostme.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: TITLE,

  description: DESCRIPTION,

  applicationName: "Do Not Ghost Me",

  alternates: {
    canonical: "/companies",
  },

  authors: [{ name: "Necdet Şanlı", url: "https://www.necdetsanli.com" }],

  creator: "Necdet Şanlı",

  publisher: "Necdet Şanlı",

  keywords: [
    "recruitment ghosting",
    "job application ghosting",
    "interview ghosting",
    "hiring ghosting",
    "ghosted after interview",
    "no response after interview",
    "candidate experience",
    "recruiting transparency",
    "hiring process transparency",
    "anonymous job seeker reports",
    "anonymous hiring reports",
    "company ghosting reports",
    "ghosting statistics",
    "ghosting reports",
    "hiring accountability",
    "HR communication",
    "interview follow up",
    "job search tool",
    "job seeker platform",
    "career resources",
    "employment application tracking",
    "interview stage tracking",
    "privacy-first analytics",
    "privacy-friendly reporting",
    "browser extension company intel",
    "Do Not Ghost Me",
    "ghosting",
    "jobs",
    "recruitment",
    "hiring",
    "hr",
    "companies",
    "reporting",
    "stats",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  verification: {
    google: "G7elv8s6IYL7DpuEznZhZPTy4ff5D3tYkUpmIH0jtD8",
    other: {
      me: ["me@necdetsanli.com", "https://www.necdetsanli.com"],
    },
    // If you add Bing later:
    // other: { "msvalidate.01": "..." },
  },

  openGraph: {
    type: "website",
    url: "/companies",
    siteName: "Do Not Ghost Me",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 600,
        alt: TITLE,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/twitter-image"],
    // Do NOT set site/creator unless you actually own the handle.
    // site: "@yourhandle",
    // creator: "@yourhandle",
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-light.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1116" },
  ],
};

const COMPANIES_PATH = "/companies";

type PageProps = {
  /**
   * In Next.js 16, searchParams is a Promise and must be awaited
   * inside server components.
   */
  searchParams: Promise<SearchParams>;
};

/**
 * Server component entry point for the /companies route.
 *
 * Responsibilities:
 * - Parse and normalise filter query parameters.
 * - Fetch the current page of aggregated company data.
 * - Compute pagination URLs based on the resolved filters.
 * - Compose presentational components for filters, table and pagination.
 */
export default async function CompaniesPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);

  const { page, search } = filters;

  const { items, totalPages, totalCompanies } = await getCompaniesPage(filters);
  const hasResults = items.length > 0;

  const previousHref =
    hasResults === true && page > 1
      ? buildPageUrl(COMPANIES_PATH, Math.max(1, page - 1), filters)
      : undefined;

  const nextHref =
    hasResults === true && page < totalPages
      ? buildPageUrl(COMPANIES_PATH, Math.min(totalPages, page + 1), filters)
      : undefined;

  return (
    <div className="min-h-screen bg-base">
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <header className="mb-6 space-y-3">
          <h1 className="text-3xl font-semibold text-primary md:text-4xl">
            View companies by ghosting reports
          </h1>
          <p className="max-w-2xl text-base text-secondary md:text-lg">
            Companies ranked by the number of ghosting reports submitted by job seekers. Data is
            aggregated and anonymized.
          </p>
          <p className="max-w-2xl text-sm text-tertiary">
            Use the filters below to slice the data by country, position category, seniority and
            interview stage. Only reports from active, non-deleted entries are included.
          </p>
        </header>

        <CompaniesFilterForm filters={filters} />

        <CompaniesActiveFilters filters={filters} />

        <CompaniesResultSummary
          hasResults={hasResults}
          page={page}
          totalPages={totalPages}
          totalCompanies={totalCompanies}
          search={search}
        />

        {hasResults === true ? (
          <CompaniesTable items={items} page={page} pageSize={PAGE_SIZE} />
        ) : null}

        <CompaniesPagination
          hasResults={hasResults}
          page={page}
          totalPages={totalPages}
          previousHref={previousHref}
          nextHref={nextHref}
        />
      </section>
    </div>
  );
}
