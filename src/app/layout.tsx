// src/app/layout.tsx
import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.donotghostme.com"),
  title: {
    default: "Do Not Ghost Me",
    template: "%s | Do Not Ghost Me",
  },
  description: "Report recruitment ghosting in a privacy-safe way.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Do Not Ghost Me",
    description: "Report recruitment ghosting in a privacy-safe way.",
    url: "https://www.donotghostme.com",
    siteName: "Do Not Ghost Me",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Do Not Ghost Me",
    description: "Report recruitment ghosting in a privacy-safe way.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

type RootLayoutProps = {
  /**
   * React children rendered as the main page content.
   */
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-screen bg-base text-primary antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Navigation />
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
