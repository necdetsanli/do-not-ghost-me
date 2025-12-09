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
 */
export function Alert({
  type,
  message,
  onClose,
  className,
}: AlertProps): JSX.Element {
  const Icon = type === "success" ? CheckCircle : AlertCircle;
  const variant = type === "error" ? "destructive" : "default";

  return (
    <UiAlert variant={variant} className={className}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>

      {onClose !== undefined && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex-shrink-0 transition-opacity hover:opacity-70"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </UiAlert>
  );
}
