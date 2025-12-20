// src/components/ui/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * Supported theme modes for the application.
 * Used by components that need to switch or display the current theme.
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * Application-level theme provider.
 *
 * Wraps next-themes' ThemeProvider with sensible defaults:
 * - attribute="class" so Tailwind's `.dark` selector works correctly
 * - defaultTheme="system" to respect OS preference on first load
 * - enableSystem to keep the theme synced with OS when using "system"
 * - disableTransitionOnChange to avoid jarring CSS transitions on toggle
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps): React.JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

/**
 * App-level hook to access and control the current theme.
 * Thin wrapper around next-themes' useTheme to keep imports centralized.
 */
export function useTheme(): ReturnType<typeof useNextTheme> {
  return useNextTheme();
}
