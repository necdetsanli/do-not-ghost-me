// src/app/layout.tsx
import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Do Not Ghost Me",
  description: "Report recruitment ghosting in a privacy-safe way.",
};

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * Root layout for the app router.
 * Wraps all pages and wires up global styles and metadata.
 */
export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
