// src/components/ui/button.tsx
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2",
    "whitespace-nowrap rounded-md border border-transparent",
    "bg-surface text-primary text-sm font-medium",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-60",
    // Icon handling
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    // Focus ring aligned with design tokens
    "outline-none focus-visible:ring-2",
    "focus-visible:ring-[var(--focus-ring)]",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]",
    // aria-invalid state → error colors
    "aria-invalid:border-[var(--error-border)] aria-invalid:bg-[var(--error-bg)] aria-invalid:text-[var(--error-text)]",
  ].join(" "),
  {
    variants: {
      variant: {
        /**
         * Primary button: strong brand-colored call to action.
         */
        default: [
          "bg-[var(--color-primary-600)] text-white",
          "hover:bg-[var(--color-primary-700)]",
        ].join(" "),
        /**
         * Destructive button: uses error alert tokens.
         */
        destructive: [
          "border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-text)]",
          "hover:bg-[var(--error-bg)]",
        ].join(" "),
        /**
         * Neutral secondary button: softer surface emphasis.
         */
        secondary: ["bg-muted text-primary", "hover:bg-surface"].join(" "),
        /**
         * Outline button: transparent background with subtle border.
         */
        outline: [
          "border-[var(--border-primary)] bg-transparent text-primary",
          "hover:bg-muted",
        ].join(" "),
        /**
         * Ghost button: minimal chrome, ideal for secondary actions.
         */
        ghost: [
          "border-transparent bg-transparent text-secondary",
          "hover:bg-muted hover:text-primary",
        ].join(" "),
        /**
         * Link-style button: no chrome, just text.
         */
        link: "border-none bg-transparent p-0 text-[var(--color-primary-600)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Props for the design-system Button component.
 *
 * Extends the native `button` element props with visual variants,
 * size options and the `asChild` flag for Slot rendering.
 */
export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /**
     * When true, renders the button styles on a child element via Radix Slot.
     */
    asChild?: boolean;
  };

/**
 * Design-system button primitive.
 *
 * - Supports multiple visual variants and sizes.
 * - Uses design tokens from global.css (background, text, focus ring, error colors).
 * - Can render as a different element when `asChild` is true (for links, etc.).
 *
 * @param props - Button props including variant, size, className and asChild flag.
 * @returns A styled button element or a Slot-wrapped child element.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps): React.JSX.Element {
  const Comp = asChild === true ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
