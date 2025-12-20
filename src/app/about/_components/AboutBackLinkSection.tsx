// src/app/about/_components/AboutBackLinkSection.tsx
import type { JSX } from "react";
import Link from "next/link";

/**
 * Simple footer navigation back to the home page.
 */
export function AboutBackLinkSection(): JSX.Element {
  return (
    <section className="mt-12 flex flex-wrap items-center gap-3">
      <Link href="/" className="text-sm text-secondary underline-offset-4 hover:underline">
        Back to home
      </Link>
    </section>
  );
}
