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
 *
 * - Design-system Card üzerine sadece layout/padding ekler.
 * - Stil (border, bg, radius) ui/card'da tanımlı kalır.
 * - Mobile'da biraz daha sıkı, desktop'ta daha ferah padding.
 */
export function Card({ children, className }: CardProps): JSX.Element {
  return <UiCard className={cn("p-6 sm:p-8", className)}>{children}</UiCard>;
}

export { CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
