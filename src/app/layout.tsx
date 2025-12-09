// src/app/layout.tsx
import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";

export const metadata: Metadata = {
  title: "Do Not Ghost Me",
  description: "Report recruitment ghosting in a privacy-safe way.",
};

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * Root layout for the app router.
 * Wraps all pages and wires up global layout, navigation and metadata.
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
          <div className="flex min-h-screen flex-col bg-base">
            <Navigation />
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
