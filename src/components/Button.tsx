//src/components/Button.tsx
"use client";

import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";
import { Button as UIButton } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const baseStyles =
  "inline-flex items-center justify-center rounded-md text-sm font-semibold shadow-sm transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 hover:bg-primary-700 text-white",
  secondary:
    "bg-muted hover:bg-surface-hover text-primary border border-primary",
  outline:
    "border border-primary bg-surface hover:bg-surface-hover text-primary",
  ghost:
    "border border-transparent bg-transparent text-secondary hover:bg-surface-hover hover:text-primary",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "min-h-[32px] px-3 py-1.5 text-sm",
  md: "min-h-[40px] px-4 py-2 text-sm",
  lg: "min-h-[48px] px-6 py-3 text-base",
};

/**
 * App-level Button wrapper.
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

  return (
    <UIButton
      variant="default"
      size="default"
      type={computedType}
      className={cn(
        baseStyles,
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      {...props}
    >
      {children}
    </UIButton>
  );
}
