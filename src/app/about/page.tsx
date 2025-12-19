// src/app/about/page.tsx
import type { JSX } from "react";
import type { Metadata, Viewport } from "next";

import { AboutIntroSection } from "@/app/about/_components/AboutIntroSection";
import { AboutProblemAndHelpSection } from "@/app/about/_components/AboutProblemAndHelpSection";
import { AboutPrivacySection } from "@/app/about/_components/AboutPrivacySection";
import { AboutContributeSection } from "@/app/about/_components/AboutContributeSection";
import { AboutBackLinkSection } from "@/app/about/_components/AboutBackLinkSection";

const TITLE = "About";
const DESCRIPTION =
  "Learn why Do Not Ghost Me exists, how the data is collected and aggregated, and how privacy is protected while surfacing ghosting patterns in hiring.";
const SITE_URL = "https://www.donotghostme.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    absolute: TITLE,
  },

  description: DESCRIPTION,

  applicationName: "Do Not Ghost Me",

  alternates: {
    canonical: "/about",
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
    "about",
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
    url: "/about",
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

/**
 * About page entrypoint.
 * Responsible only for composing route-level sections.
 */
export default function AboutPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-8 md:py-16">
      <AboutIntroSection />
      <AboutProblemAndHelpSection />
      <AboutPrivacySection />
      <AboutContributeSection />
      <AboutBackLinkSection />
    </div>
  );
}
