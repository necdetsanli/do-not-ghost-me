// src/components/GithubCta.tsx
import type { JSX } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/utils";

export const GITHUB_REPO_URL = "https://github.com/necdetsanli/do-not-ghost-me";

interface GithubCtaProps {
  /** Button label text. */
  label?: string;
  /** Extra className overrides. */
  className?: string;
}

/**
 * Reusable GitHub CTA button used across pages.
 */
export function GithubCta({
  label = "View project on GitHub",
  className,
}: GithubCtaProps): JSX.Element {
  return (
    <Link
      href={GITHUB_REPO_URL}
      prefetch={false}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border",
        "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]",
        "px-4 py-2 text-sm font-medium text-white shadow-sm",
        "transition-[background-color,box-shadow,transform,color]",
        "hover:bg-[var(--color-primary-700)] hover:-translate-y-px",
        "active:translate-y-0",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]",
        className,
      )}
    >
      {label}
    </Link>
  );
}
