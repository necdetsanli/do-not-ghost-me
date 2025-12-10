// src/components/Alert.tsx
"use client";

import type { JSX } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

import { Alert as UiAlert, AlertDescription } from "@/components/ui/alert";

type AlertType = "success" | "error";

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  className?: string;
}

/**
 * App-level Alert wrapper.
 *
 * - Maps domain-level `type` to design-system variants.
 * - Renders a leading icon and an optional dismiss button.
 */
export function Alert({
  type,
  message,
  onClose,
  className,
}: AlertProps): JSX.Element {
  const Icon = type === "success" ? CheckCircle : AlertCircle;
  const variant = type === "error" ? "destructive" : "success";

  return (
    <UiAlert variant={variant} className={className}>
      {/* Leading icon (grid col 1) */}
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />

      {/* Message (grid col 2) */}
      <AlertDescription>{message}</AlertDescription>

      {/* Dismiss button (grid col 2, top-right) */}
      {onClose !== undefined && (
        <button
          type="button"
          onClick={onClose}
          className="col-start-2 row-start-1 ml-auto flex h-4 w-4 items-center justify-center shrink-0 self-start transition-opacity hover:opacity-70"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </UiAlert>
  );
}
