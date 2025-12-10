// src/components/ui/select.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "./utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export type SelectTriggerProps = React.ComponentProps<
  typeof SelectPrimitive.Trigger
>;

/**
 * Trigger button for the select.
 *
 * - Full-width on mobile by default.
 * - Uses design tokens for border, background and focus ring.
 */
export function SelectTrigger({
  className,
  children,
  ...props
}: SelectTriggerProps): JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-primary",
        "bg-surface px-3 py-1.5 text-sm text-primary shadow-sm",
        "placeholder:text-tertiary selection:bg-[var(--color-primary-600)] selection:text-white",
        "transition-[background-color,color,box-shadow] outline-none cursor-pointer",
        "focus-visible:border-[var(--focus-ring)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]",
        "aria-invalid:border-[var(--error-border)] aria-invalid:bg-[var(--error-bg)] aria-invalid:text-[var(--error-text)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="ml-2 size-4 opacity-60" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export type SelectContentProps = React.ComponentProps<
  typeof SelectPrimitive.Content
> & {
  /**
   * Controls how the popup is positioned.
   * - "popper": aligns to the trigger dimensions.
   * - "item-aligned": Radix default item alignment.
   */
  position?: "item-aligned" | "popper";
};

/**
 * Popup panel for the select options.
 *
 * - Uses a portal so it can escape overflow/parents.
 * - Keeps height constrained on small screens.
 */
export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: SelectContentProps): JSX.Element {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-md border border-primary",
          "bg-surface text-primary shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
          <ChevronUp className="size-4" aria-hidden="true" />
        </SelectPrimitive.ScrollUpButton>

        <SelectPrimitive.Viewport
          className={cn(
            "max-h-60 p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>

        <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
          <ChevronDown className="size-4" aria-hidden="true" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export type SelectLabelProps = React.ComponentProps<
  typeof SelectPrimitive.Label
>;

/**
 * Group label inside the select dropdown.
 */
export function SelectLabel({
  className,
  ...props
}: SelectLabelProps): JSX.Element {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-secondary",
        className,
      )}
      {...props}
    />
  );
}

export type SelectItemProps = React.ComponentProps<typeof SelectPrimitive.Item>;

/**
 * Single selectable option row.
 *
 * - Uses our global highlight styles via `[data-slot="select-item"]`.
 * - Shows a check icon when selected.
 */
export function SelectItem({
  className,
  children,
  ...props
}: SelectItemProps): JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full select-none items-center rounded-md px-2 py-1.5 text-sm outline-none",
        "data-[state=checked]:font-medium",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <Check className="size-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export type SelectSeparatorProps = React.ComponentProps<
  typeof SelectPrimitive.Separator
>;

/**
 * Visual separator between groups of options.
 */
export function SelectSeparator({
  className,
  ...props
}: SelectSeparatorProps): JSX.Element {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-[var(--border-primary)]", className)}
      {...props}
    />
  );
}

export {
  // Re-export primitives for convenience
  SelectPrimitive as SelectPrimitiveInternal,
};
