// src/app/layout.tsx
import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Do Not Ghost Me",
  description: "Report recruitment ghosting in a privacy-safe way.",
};

type RootLayoutProps = {
  /**
   * React children rendered as the main page content.
   */
  children: ReactNode;
};

/**
 * Root layout for the app router.
 *
 * Wraps all pages with the theme provider, global navigation and base layout
 * while ensuring a mobile-friendly, full-height flex column structure.
 *
 * @param props - Component props containing the page children.
 * @returns The root HTML layout element for the application.
 */
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
