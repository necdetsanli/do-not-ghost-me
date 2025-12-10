// src/components/ui/label.tsx
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

export type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

/**
 * Accessible form label built on top of Radix UI's Label primitive.
 *
 * - Uses design-system typography and colors.
 * - Supports `peer-disabled` and `group-data-[disabled]` patterns to keep
 *   the label visually in sync with the associated form control.
 *
 * @param props - Label props including children and optional `className`.
 * @returns A styled label element associated with a form control.
 */
export function Label({ className, ...props }: LabelProps): React.JSX.Element {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex select-none items-center gap-2 text-sm font-medium leading-none text-secondary",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
