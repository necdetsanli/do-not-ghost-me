// src/components/ui/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges arbitrary className inputs into a single Tailwind-safe string.
 *
 * It uses `clsx` for conditional logic and `tailwind-merge` to resolve
 * conflicting Tailwind utilities (for example "px-2 px-4" → "px-4").
 *
 * @param inputs - Class name values (strings, arrays, conditionals).
 * @returns A merged className string suitable for use as a React `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
