// src/components/Label.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";
import { Label as UiLabel } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";

/**
 * Props for the app-level Label wrapper.
 * Extends the ui/label primitive props and adds an optional isRequired flag.
 */
type UiLabelProps = React.ComponentPropsWithoutRef<typeof UiLabel>;

export interface LabelProps extends UiLabelProps {
  /** Optional flag for visually indicating a required field. */
  isRequired?: boolean | undefined;
}

/**
 * App-level Label wrapper.
 * Uses the ui/label primitive and adds a required asterisk when isRequired is true.
 */
export function Label({
  className,
  children,
  isRequired,
  ...props
}: LabelProps): JSX.Element {
  return (
    <UiLabel
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    >
      {children}
      {isRequired === true ? (
        <span aria-hidden="true" className="text-[var(--error-text)]">
          *
        </span>
      ) : null}
    </UiLabel>
  );
}
