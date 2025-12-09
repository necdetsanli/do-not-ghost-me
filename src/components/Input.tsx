// src/components/Input.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";

import { Input as UiInput } from "@/components/ui/input";
import { Label } from "@/components/Label";
import { cn } from "@/components/ui/utils";

/**
 * Resolve the effective "required" flag for form fields.
 *
 * Priority:
 * 1. Explicit isRequired prop (app-level).
 * 2. Native required prop.
 * 3. aria-required prop (boolean or "true").
 */
const getEffectiveIsRequired = (
  isRequiredExplicit: boolean | undefined,
  requiredProp: boolean | undefined,
  ariaRequiredProp: boolean | string | undefined,
): boolean | undefined => {
  if (isRequiredExplicit !== undefined) {
    return isRequiredExplicit;
  }

  if (requiredProp === true) {
    return true;
  }

  if (ariaRequiredProp === true || ariaRequiredProp === "true") {
    return true;
  }

  return undefined;
};

/**
 * Props for the app-level Input wrapper.
 * Extends the underlying UiInput props and adds label, description and error support.
 */
type UiInputProps = React.ComponentPropsWithoutRef<typeof UiInput>;

export interface InputProps extends UiInputProps {
  /** Optional label rendered above the input. */
  label?: React.ReactNode;
  /** Optional description/help text shown below the input. */
  description?: string;
  /** Optional error message shown below the input. */
  errorMessage?: string;
  /** Extra class for the wrapper <div>, not the input itself. */
  containerClassName?: string;
  /** App-level required flag (preferred). */
  isRequired?: boolean | undefined;
}

/**
 * Text input wrapper component.
 * Provides label, description, error and required indicator on top of UiInput.
 */
export function Input({
  label,
  description,
  errorMessage,
  containerClassName,
  isRequired,
  id,
  name,
  className,
  required,
  "aria-required": ariaRequired,
  ...props
}: InputProps): JSX.Element {
  const generatedId: string = React.useId();

  // Prefer explicit id, fall back to name, then a generated id.
  const inputId: string =
    id !== undefined ? id : typeof name === "string" ? name : generatedId;

  const descriptionId: string | undefined =
    description !== undefined ? `${inputId}-description` : undefined;
  const errorId: string | undefined =
    errorMessage !== undefined ? `${inputId}-error` : undefined;

  const describedByIds: string[] = [];
  if (descriptionId !== undefined) {
    describedByIds.push(descriptionId);
  }
  if (errorId !== undefined) {
    describedByIds.push(errorId);
  }

  const ariaDescribedBy: string | undefined =
    describedByIds.length > 0 ? describedByIds.join(" ") : undefined;

  const effectiveIsRequired: boolean | undefined = getEffectiveIsRequired(
    isRequired,
    required,
    ariaRequired,
  );

  return (
    <div className={cn("flex flex-col gap-2", containerClassName)}>
      {label !== undefined ? (
        <Label htmlFor={inputId} isRequired={effectiveIsRequired}>
          {label}
        </Label>
      ) : null}

      <UiInput
        id={inputId}
        name={name}
        className={className}
        required={effectiveIsRequired === true ? true : undefined}
        aria-required={effectiveIsRequired === true ? true : undefined}
        aria-invalid={errorMessage !== undefined}
        aria-describedby={ariaDescribedBy}
        {...props}
      />

      {description !== undefined ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {errorMessage !== undefined ? (
        <p id={errorId} className="text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
