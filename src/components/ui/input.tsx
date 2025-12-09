// src/components/ui/input.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";

import { cn } from "./utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">): JSX.Element {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-primary bg-surface px-3 py-1 text-base md:text-sm",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary",
        "placeholder:text-tertiary selection:bg-primary selection:text-primary-foreground",
        "transition-[color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
