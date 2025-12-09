//src/components/ui/alert.tsx
"use client";

import type { ComponentProps, JSX } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  // Base layout: grid, nice spacing, neutral surface
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border border-primary bg-surface px-4 py-3 text-sm text-primary " +
    // When an icon is present as the first direct child, switch to 2-column layout
    "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 has-[>svg]:[&>svg]:size-4 has-[>svg]:[&>svg]:translate-y-0.5 has-[>svg]:[&>svg]:text-current",
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
 * - Supports optional leading icon as the first direct child.
 * - Uses design tokens from global.css for background, border and text colors.
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
