// src/components/ui/label.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>): JSX.Element {
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
