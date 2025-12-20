// src/components/ui/input.tsx
"use client";

import * as React from "react";

import { cn } from "./utils";

export type InputProps = React.ComponentProps<"input">;

/**
 * Design-system input component for text-like values and file uploads.
 *
 * - Expands to full width and works well on mobile layouts.
 * - Uses design tokens from globals.css for background, borders and focus ring.
 * - Respects `aria-invalid` for error highlighting.
 *
 * @param props - Standard input props plus optional `className` override.
 * @returns A styled input element.
 */
export function Input({ className, type, ...props }: InputProps): React.JSX.Element {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout & sizing
        "flex h-9 w-full min-w-0 rounded-md border border-primary bg-surface px-3 py-1 text-sm",
        // Typography & placeholder
        "text-primary placeholder:text-tertiary",
        // Selection colors
        "selection:bg-[var(--color-primary-600)] selection:text-white",
        // Transitions & focus ring using design tokens
        "outline-none transition-[background-color,border-color,box-shadow,color] duration-150",
        "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]",
        // Error state via aria-invalid
        "aria-invalid:border-[var(--error-border)] aria-invalid:bg-[var(--error-bg)] aria-invalid:text-[var(--error-text)]",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        // File input styling
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary",
        className,
      )}
      {...props}
    />
  );
}
