// src/components/ui/navigation-menu.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "./utils";

export type NavigationMenuProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Root
> & {
  /**
   * Controls whether the shared viewport container is rendered.
   * When false, each content panel behaves more like a standalone popover.
   */
  viewport?: boolean;
};

/**
 * Top-level navigation menu root.
 *
 * Wraps Radix NavigationMenu.Root and wires up:
 * - a flex container that centers items,
 * - an optional shared viewport for animated content panels.
 *
 * @param props - Navigation menu props including children and optional `viewport` toggle.
 * @returns The styled navigation menu root element.
 */
export function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: NavigationMenuProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
      {viewport === true ? <NavigationMenuViewport /> : null}
    </NavigationMenuPrimitive.Root>
  );
}

export type NavigationMenuListProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.List
>;

/**
 * Container for navigation menu items.
 *
 * Renders a horizontal flex row that aligns items and
 * provides consistent gaps between them.
 *
 * @param props - List props including children and optional `className`.
 * @returns The styled navigation menu list element.
 */
export function NavigationMenuList({
  className,
  ...props
}: NavigationMenuListProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "flex flex-1 list-none items-center justify-center gap-1",
        className,
      )}
      {...props}
    />
  );
}

export type NavigationMenuItemProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Item
>;

/**
 * Single navigation menu item wrapper.
 *
 * This is usually composed of:
 * - a {@link NavigationMenuTrigger} for the button,
 * - an optional {@link NavigationMenuContent} panel.
 *
 * @param props - Item props including children and optional `className`.
 * @returns The styled navigation menu item element.
 */
export function NavigationMenuItem({
  className,
  ...props
}: NavigationMenuItemProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

/**
 * Base trigger style for navigation menu buttons.
 *
 * Kept as a separate cva so it can be reused in custom components if needed.
 */
export const navigationMenuTriggerStyle = cva(
  "inline-flex h-9 w-max items-center justify-center rounded-md bg-surface px-3 py-2 text-sm font-medium text-secondary",
  {
    variants: {
      intent: {
        default: "",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  },
);

export type NavigationMenuTriggerProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Trigger
>;

/**
 * Trigger button for a navigation menu item.
 *
 * - Shows the current label.
 * - Renders a chevron icon that rotates when open.
 * - Uses hover, focus and open-state styles aligned with the design tokens.
 *
 * @param props - Trigger props including children and optional `className`.
 * @returns The styled navigation menu trigger element.
 */
export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuTriggerProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(
        navigationMenuTriggerStyle(),
        "group",
        "cursor-pointer",
        "hover:bg-surface-hover hover:text-primary",
        "focus:bg-surface-hover focus:text-primary",
        "data-[state=open]:bg-muted data-[state=open]:text-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "transition-[background-color,color,box-shadow]",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

export type NavigationMenuContentProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Content
>;

/**
 * Content panel for a navigation menu item.
 *
 * - When `viewport` is enabled on the root, panels animate inside
 *   a shared viewport.
 * - When `viewport` is disabled, this behaves more like a popover
 *   attached directly under the trigger.
 *
 * @param props - Content props including children and optional `className`.
 * @returns The styled navigation menu content element.
 */
export function NavigationMenuContent({
  className,
  ...props
}: NavigationMenuContentProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
        "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out",
        "data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out",
        "data-[motion=from-end]:slide-in-from-right-52",
        "data-[motion=from-start]:slide-in-from-left-52",
        "data-[motion=to-end]:slide-out-to-right-52",
        "data-[motion=to-start]:slide-out-to-left-52",
        "group-data-[viewport=false]/navigation-menu:top-full",
        "group-data-[viewport=false]/navigation-menu:mt-1.5",
        "group-data-[viewport=false]/navigation-menu:bg-surface",
        "group-data-[viewport=false]/navigation-menu:text-primary",
        "group-data-[viewport=false]/navigation-menu:overflow-hidden",
        "group-data-[viewport=false]/navigation-menu:rounded-md",
        "group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:border-primary",
        "group-data-[viewport=false]/navigation-menu:shadow-md",
        "group-data-[viewport=false]/navigation-menu:duration-200",
        "group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in",
        "group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out",
        "group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95",
        "group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95",
        "group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0",
        "group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export type NavigationMenuViewportProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Viewport
>;

/**
 * Shared viewport container for animated navigation menu content.
 *
 * - Positions the content just below the menu bar.
 * - Applies shared border, background and animation styles.
 *
 * @param props - Viewport props including optional `className`.
 * @returns The styled navigation menu viewport element.
 */
export function NavigationMenuViewport({
  className,
  ...props
}: NavigationMenuViewportProps): JSX.Element {
  return (
    <div className="absolute left-0 top-full z-50 flex justify-center isolate">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border border-primary bg-surface text-primary shadow-md origin-top-center",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90",
          "md:w-[var(--radix-navigation-menu-viewport-width)]",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export type NavigationMenuLinkProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Link
>;

/**
 * Link used inside navigation menu content.
 *
 * - Supports active and hover states.
 * - Aligns icon size and color with the design system.
 *
 * @param props - Link props including children and optional `className`.
 * @returns The styled navigation menu link element.
 */
export function NavigationMenuLink({
  className,
  ...props
}: NavigationMenuLinkProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-1 rounded-md p-2 text-sm transition-colors",
        "hover:bg-surface-hover hover:text-primary",
        "focus:bg-surface-hover focus:text-primary",
        "data-[active=true]:bg-muted data-[active=true]:text-primary",
        "[&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export type NavigationMenuIndicatorProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Indicator
>;

/**
 * Small arrow indicator rendered under the active trigger when
 * using the shared viewport mode.
 *
 * @param props - Indicator props including optional `className`.
 * @returns The styled navigation menu indicator element.
 */
export function NavigationMenuIndicator({
  className,
  ...props
}: NavigationMenuIndicatorProps): JSX.Element {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out",
        "data-[state=hidden]:fade-out data-[state=visible]:fade-in",
        className,
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-surface border border-primary shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  );
}
