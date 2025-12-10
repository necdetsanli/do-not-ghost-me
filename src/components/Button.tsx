// src/components/Button.tsx
"use client";

import type { JSX, ReactNode } from "react";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type UiButtonProps = React.ComponentProps<typeof UiButton>;

export interface ButtonProps extends Omit<UiButtonProps, "variant" | "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

/**
 * App-level Button wrapper.
 *
 * - Design-system Button'ı (ui/button) kullanır.
 * - Domain tarafında daha semantik variant/size isimleri sunar.
 * - Stil tanımı yapmaz; tüm görsel kimlik ui/button içinde kalır.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  type,
  children,
  ...props
}: ButtonProps): JSX.Element {
  const computedType: ButtonProps["type"] = type ?? "button";

  // App-level → UI-level variant map
  const uiVariant: UiButtonProps["variant"] =
    variant === "primary"
      ? "default"
      : variant === "secondary"
        ? "secondary"
        : variant === "outline"
          ? "outline"
          : variant === "ghost"
            ? "ghost"
            : variant === "destructive"
              ? "destructive"
              : "link"; // "link"

  // App-level → UI-level size map
  const uiSize: UiButtonProps["size"] =
    size === "sm"
      ? "sm"
      : size === "md"
        ? "default"
        : size === "lg"
          ? "lg"
          : "icon";

  return (
    <UiButton
      type={computedType}
      variant={uiVariant}
      size={uiSize}
      className={cn(className)}
      {...props}
    >
      {children}
    </UiButton>
  );
}
