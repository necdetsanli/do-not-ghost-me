// src/app/admin/layout.tsx
import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

type AdminLayoutProps = {
  /**
   * Admin route subtree content.
   */
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps): JSX.Element {
  return <main>{children}</main>;
}
