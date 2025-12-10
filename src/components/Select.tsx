// src/components/Select.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";
import {
  Select as UiSelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/components/ui/utils";
import { Label } from "@/components/Label";

/** Single option in the Select component. */
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export type SelectContentPosition = "item-aligned" | "popper";

export interface SelectProps {
  /** Controlled value (if using as controlled component). */
  value?: string;
  /** Initial value for uncontrolled usage. */
  defaultValue?: string;
  /** Called when the selected value changes. */
  onValueChange?: (value: string) => void;

  /** Optional label shown above the control. */
  label?: React.ReactNode;
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
  /** Helper text shown under the control. */
  description?: string;
  /** Error message shown under the control. */
  errorMessage?: string;

  /** App-level required flag (preferred). */
  isRequired?: boolean | undefined;
  /** HTML-style required prop (for compatibility with existing usages). */
  required?: boolean;
  /** HTML-style aria-required prop (for compatibility). */
  "aria-required"?: boolean | string;

  /** Disable the whole select. */
  disabled?: boolean;

  /** Id used to associate label and aria attributes. */
  id?: string;

  /** Name used for a hidden <input> so values submit via HTML forms. */
  name?: string;

  /** Options shown in the dropdown. Options with empty value are ignored. */
  options: SelectOption[];

  /** Classes for layout/styling. */
  containerClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;

  /** Position strategy for dropdown content. */
  contentPosition?: SelectContentPosition;
}

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
 * App-level Select wrapper built on top of ui/select primitives.
 * Adds label, description, error, required styling and form-friendly name support.
 */
export function Select({
  value,
  defaultValue,
  onValueChange,
  label,
  placeholder,
  description,
  errorMessage,
  isRequired,
  required,
  "aria-required": ariaRequired,
  disabled,
  id,
  name,
  options,
  containerClassName,
  triggerClassName,
  contentClassName,
  contentPosition = "popper",
}: SelectProps): JSX.Element {
  const generatedId: string = React.useId();
  const selectId: string = id ?? generatedId;

  const descriptionId: string | undefined =
    description !== undefined ? `${selectId}-description` : undefined;
  const errorId: string | undefined =
    errorMessage !== undefined ? `${selectId}-error` : undefined;

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

  // Controlled vs uncontrolled
  const isControlled: boolean = value !== undefined;

  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    defaultValue,
  );

  const currentValue: string | undefined =
    isControlled === true ? value : internalValue;

  const handleValueChange = (nextValue: string): void => {
    if (isControlled === false) {
      setInternalValue(nextValue);
    }

    if (onValueChange !== undefined) {
      onValueChange(nextValue);
    }
  };

  const validOptions: SelectOption[] = React.useMemo(
    (): SelectOption[] =>
      options.filter(
        (option: SelectOption): boolean => option.value.trim() !== "",
      ),
    [options],
  );

  const rootProps: React.ComponentProps<typeof UiSelectRoot> = {
    onValueChange: handleValueChange,
    disabled: disabled === true,
  };

  if (isControlled === true && currentValue !== undefined) {
    rootProps.value = currentValue;
  } else if (isControlled === false && defaultValue !== undefined) {
    rootProps.defaultValue = defaultValue;
  }

  return (
    <div className={cn("flex flex-col gap-1", containerClassName)}>
      {label !== undefined ? (
        <Label htmlFor={selectId} isRequired={effectiveIsRequired}>
          {label}
        </Label>
      ) : null}

      <UiSelectRoot {...rootProps}>
        <SelectTrigger
          id={selectId}
          aria-required={effectiveIsRequired === true ? true : undefined}
          aria-invalid={errorMessage !== undefined}
          aria-describedby={ariaDescribedBy}
          className={cn("w-full", triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          position={contentPosition}
          className={cn(contentClassName)}
        >
          {validOptions.map(
            (option: SelectOption): JSX.Element => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled === true}
              >
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description !== undefined ? (
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </div>
              </SelectItem>
            ),
          )}
        </SelectContent>
      </UiSelectRoot>

      {name !== undefined ? (
        <input
          type="hidden"
          name={name}
          value={currentValue ?? ""}
          required={effectiveIsRequired === true ? true : undefined}
        />
      ) : null}

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
