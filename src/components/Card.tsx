// src/components/Card.tsx
"use client";

import type { JSX, ReactNode } from "react";
import {
  Card as UiCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/components/ui/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * App-level Card wrapper.
 */
export function Card({ children, className }: CardProps): JSX.Element {
  return (
    <UiCard
      className={cn(
        "rounded-2xl border border-primary bg-surface p-8",
        className,
      )}
    >
      {children}
    </UiCard>
  );
}

export {
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
