// src/components/Navigation.tsx
"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { Button } from "@/components/Button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { cn } from "@/components/ui/utils";

// Client-only theme toggle (no SSR → no hydration mismatch)
const ThemeToggle = dynamic(
  () => import("./ThemeToggle").then((m) => m.ThemeToggle),
  { ssr: false },
);

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/top-companies", label: "Top companies" },
  { href: "/about", label: "About" },
];

function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.exact === true) {
    return pathname === item.href;
  }
  return pathname.startsWith(item.href);
}

/**
 * Top-level navigation bar for all public pages.
 */
export function Navigation(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();

  const currentPath = pathname ?? "/";

  function handleSubmitClick(): void {
    if (currentPath === "/") {
      const formElement = document.getElementById("report-form");
      if (formElement !== null) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    router.push("/#report-form");
  }

  return (
    <nav
      className="sticky top-0 z-50 border-b border-primary bg-surface shadow-sm"
      role="navigation"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3",
          "sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0",
          "md:px-8 md:h-16",
        )}
      >
        {/* Brand */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-primary transition-opacity hover:opacity-70 sm:text-xl"
          aria-label="Go to home page"
        >
          Do Not Ghost Me
        </Link>

        {/* Links + actions */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 sm:justify-end">
          <NavigationMenu
            viewport={false}
            className="w-full max-w-full justify-center sm:w-auto sm:max-w-max sm:justify-start"
          >
            <NavigationMenuList>
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(currentPath, item);

                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      asChild
                      data-active={active ? "true" : "false"}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "text-sm transition-colors",
                          active
                            ? "font-medium text-primary"
                            : "text-secondary hover:text-primary",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Theme toggle (client-only, no SSR) */}
          <ThemeToggle />

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmitClick}
            aria-label="Submit a ghosting report"
            className="w-full sm:w-auto"
          >
            Submit report
          </Button>
        </div>
      </div>
    </nav>
  );
}
