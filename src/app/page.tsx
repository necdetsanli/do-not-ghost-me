// src/app/page.tsx
import type { JSX } from "react";
import { HomeHero } from "@/app/_components/HomeHero";
import { HomeStatsPanel } from "@/app/_components/HomeStatsPanel";
import { ReportForm } from "@/app/_components/ReportForm";
import type { Metadata, Viewport } from "next";

const TITLE = "Do Not Ghost Me";
const DESCRIPTION =
  "Report recruitment ghosting anonymously and explore aggregated, privacy-first stats by company, country, interview stage and job level.";
const SITE_URL = "https://www.donotghostme.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    absolute: TITLE,
  },

  description: DESCRIPTION,

  applicationName: TITLE,

  alternates: {
    canonical: "/",
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
    url: "/",
    siteName: TITLE,
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

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-base">
      {/* Hero section */}
      <section
        className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-24"
        aria-labelledby="home-hero-heading"
      >
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)]">
          <div>
            <HomeHero />
          </div>
          <HomeStatsPanel />
        </div>
      </section>

      {/* Report form section */}
      <ReportForm />
    </div>
  );
}
