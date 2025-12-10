// src/components/ui/card.tsx
import * as React from "react";

import { cn } from "./utils";

export type CardProps = React.ComponentProps<"div">;
export type CardHeaderProps = React.ComponentProps<"div">;
export type CardTitleProps = React.ComponentProps<"div">;
export type CardDescriptionProps = React.ComponentProps<"div">;
export type CardActionProps = React.ComponentProps<"div">;
export type CardContentProps = React.ComponentProps<"div">;
export type CardFooterProps = React.ComponentProps<"div">;

/**
 * Root card container used for grouping related content.
 *
 * @param props - Card props including optional `className` and `children`.
 * @returns A styled card wrapper element.
 */
function Card({ className, ...props }: CardProps): React.JSX.Element {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-xl border border-primary bg-surface text-primary",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card header section, typically containing title, description and actions.
 *
 * Uses a responsive grid layout that adapts when a `CardAction` is present.
 *
 * @param props - Header props including optional `className` and `children`.
 * @returns A styled card header element.
 */
function CardHeader({
  className,
  ...props
}: CardHeaderProps): React.JSX.Element {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card title text, usually a short heading.
 *
 * @param props - Title props including optional `className` and `children`.
 * @returns A styled heading element for the card title.
 */
function CardTitle({ className, ...props }: CardTitleProps): React.JSX.Element {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none text-primary", className)}
      {...props}
    />
  );
}

/**
 * Card description text, used for secondary explanatory content.
 *
 * @param props - Description props including optional `className` and `children`.
 * @returns A styled paragraph element for the card description.
 */
function CardDescription({
  className,
  ...props
}: CardDescriptionProps): React.JSX.Element {
  return (
    <p
      data-slot="card-description"
      className={cn("text-secondary", className)}
      {...props}
    />
  );
}

/**
 * Card action container, typically used for primary actions in the header.
 *
 * On larger screens it aligns to the right; on mobile it naturally wraps
 * under the title/description thanks to the grid layout.
 *
 * @param props - Action props including optional `className` and `children`.
 * @returns A styled container for card actions.
 */
function CardAction({
  className,
  ...props
}: CardActionProps): React.JSX.Element {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Main card content area.
 *
 * @param props - Content props including optional `className` and `children`.
 * @returns A styled container for the card body content.
 */
function CardContent({
  className,
  ...props
}: CardContentProps): React.JSX.Element {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

/**
 * Card footer section, typically used for secondary actions or meta information.
 *
 * @param props - Footer props including optional `className` and `children`.
 * @returns A styled container for the card footer content.
 */
function CardFooter({
  className,
  ...props
}: CardFooterProps): React.JSX.Element {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
