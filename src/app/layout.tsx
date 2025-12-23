// src/app/layout.tsx
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import type { JSX, ReactNode } from "react";
import "./globals.css";

const SITE_NAME = "Do Not Ghost Me";
const SITE_DESCRIPTION = "A privacy-aware way to track and surface ghosting in hiring processes.";
const SITE_URL = "https://www.donotghostme.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  applicationName: SITE_NAME,

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
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 600,
        alt: SITE_NAME,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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

type RootLayoutProps = {
  /**
   * React children rendered as the main page content.
   */
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "en",
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: "Necdet Şanlı",
        url: "https://www.necdetsanli.com",
        sameAs: ["https://github.com/necdetsanli", "https://www.necdetsanli.com"],
        email: "mailto:me@necdetsanli.com",
      },
    ],
  } as const;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navigation />
          {children}
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
