// src/components/ThemeToggle.tsx
"use client";

import type { JSX } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/Button";
import { useTheme } from "@/components/ui/theme-provider";

/**
 * Client-only theme toggle group.
 * Rendered via dynamic import (ssr: false) to avoid hydration issues.
 */
export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();

  const currentTheme: "light" | "dark" | "system" =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

  const isLightActive = currentTheme === "light";
  const isDarkActive = currentTheme === "dark";
  const isSystemActive = currentTheme === "system";

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-primary bg-muted px-1 py-1"
      role="group"
      aria-label="Theme toggle"
    >
      <Button
        type="button"
        variant={isLightActive ? "secondary" : "ghost"}
        size="sm"
        onClick={(): void => setTheme("light")}
        className="flex items-center gap-1 rounded-full px-2 sm:px-3"
        aria-label="Light theme"
        aria-pressed={isLightActive}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
        <span className="hidden text-xs sm:inline">Light</span>
      </Button>

      <Button
        type="button"
        variant={isDarkActive ? "secondary" : "ghost"}
        size="sm"
        onClick={(): void => setTheme("dark")}
        className="flex items-center gap-1 rounded-full px-2 sm:px-3"
        aria-label="Dark theme"
        aria-pressed={isDarkActive}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden text-xs sm:inline">Dark</span>
      </Button>

      <Button
        type="button"
        variant={isSystemActive ? "secondary" : "ghost"}
        size="sm"
        onClick={(): void => setTheme("system")}
        className="flex items-center gap-1 rounded-full px-2 sm:px-3"
        aria-label="System theme"
        aria-pressed={isSystemActive}
      >
        <Monitor className="h-4 w-4" aria-hidden="true" />
        <span className="hidden text-xs sm:inline">System</span>
      </Button>
    </div>
  );
}
