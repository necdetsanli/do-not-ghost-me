import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Do Not Ghost Me",
  description: "Report recruitment ghosting in a privacy-safe way.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
