// src/components/ui/alert.tsx
"use client";

import type { ComponentProps, JSX } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  // Base layout: grid, nice spacing, neutral surface
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border border-primary bg-surface px-4 py-3 text-sm text-primary " +
    // When an icon is present as the first direct child, switch to 2-column layout
    // Uses a fixed column width for the icon to keep layout stable across viewports.
    "has-[>svg]:grid-cols-[1.5rem_1fr] has-[>svg]:gap-x-3 has-[>svg]:[&>svg]:size-4 has-[>svg]:[&>svg]:translate-y-0.5 has-[>svg]:[&>svg]:text-current",
  {
    variants: {
      variant: {
        // Neutral/info-style alert, uses base colors.
        default: "",
        // Error / destructive actions, uses global alert-error token.
        destructive: "alert-error",
        // Explicit success variant (e.g. after form submission).
        success: "alert-success",
        // Warnings / soft errors.
        warning: "alert-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/**
 * Generic alert container used for inline status messages.
 *
 * Supports an optional leading icon placed as the first direct child.
 * Uses design tokens from globals.css for background, border and text colors
 * and is fully responsive by default (grid-based, fluid width).
 *
 * @param props - Alert component props including children, className and variant.
 * @returns A styled alert container element.
 */
function Alert({ className, variant, ...props }: AlertProps): JSX.Element {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * Alert title row. Usually the first line of text.
 *
 * Renders on the second grid column so that an optional leading icon
 * can occupy the first column on all screen sizes.
 *
 * @param props - Standard div props including children and className.
 * @returns A styled title row for the alert.
 */
function AlertTitle({
  className,
  ...props
}: ComponentProps<"div">): JSX.Element {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 min-h-4 line-clamp-1 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Alert body / description. Intended for one or more short lines of text.
 *
 * Uses a small vertical gap and secondary text color, and keeps content
 * aligned in the second grid column to match the title and icon layout.
 *
 * @param props - Standard div props including children and className.
 * @returns A styled description container for the alert.
 */
function AlertDescription({
  className,
  ...props
}: ComponentProps<"div">): JSX.Element {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-secondary [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
