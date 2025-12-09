// src/components/CountrySelect.tsx
"use client";

import type { JSX, ChangeEvent, FocusEvent, MouseEvent } from "react";
import { useId, useState } from "react";
import type { CountryCode } from "@prisma/client";
import { COUNTRY_OPTIONS, labelForCountry } from "@/lib/enums";
import { Label } from "@/components/Label";

type CountrySelectProps = {
  /**
   * Name of the hidden input that will carry the selected CountryCode
   * in the form POST/GET body (e.g. "country").
   */
  name: string;
  /**
   * Optional id to associate the visible text input with an external label.
   */
  id?: string;
  /**
   * Optional label text. Defaults to "Country".
   */
  label?: string;
  /**
   * Marks the field as required visually and via aria-required.
   */
  isRequired?: boolean | undefined;
  /**
   * Initial selected CountryCode (for prefilled filters, e.g. /top-companies).
   */
  initialCode?: CountryCode | "" | undefined;
  /**
   * Optional callback: informs parent about the currently selected CountryCode.
   * Used by the form to do client-side validation / reset logic.
   */
  onChangeCode?: (code: CountryCode | "") => void;
};

type CountryOption = {
  code: CountryCode;
  label: string;
};

/**
 * CountrySelect renders a simple type-ahead country picker backed by CountryCode enums.
 *
 * Behaviour:
 * - Users type a few letters of the country name (e.g. "Ger").
 * - The dropdown shows countries whose labels start with the query.
 * - When a country is chosen, the visible input displays its human label
 *   and a hidden <input name={name}> stores the CountryCode value.
 */
export function CountrySelect({
  name,
  id,
  label = "Country",
  isRequired,
  initialCode,
  onChangeCode,
}: CountrySelectProps): JSX.Element {
  const generatedId: string = useId();
  const inputId: string = id ?? generatedId;
  const listboxId: string = `${inputId}-listbox`;

  const [selectedCode, setSelectedCode] = useState<CountryCode | "">(
    initialCode !== undefined ? initialCode : "",
  );

  const [query, setQuery] = useState<string>(() => {
    if (initialCode !== undefined && initialCode !== "") {
      return labelForCountry(initialCode as CountryCode);
    }
    return "";
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const normalizedQuery = query.trim().toLowerCase();

  const options: CountryOption[] = COUNTRY_OPTIONS.map(
    (code: CountryCode): CountryOption => ({
      code,
      label: labelForCountry(code),
    }),
  ).sort((a: CountryOption, b: CountryOption): number =>
    a.label.localeCompare(b.label),
  );

  const filteredOptions: CountryOption[] = options.filter(
    (option: CountryOption): boolean => {
      if (normalizedQuery === "") {
        return true;
      }

      return option.label.toLowerCase().startsWith(normalizedQuery);
    },
  );

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    setQuery(value);
    setIsOpen(true);

    if (selectedCode !== "") {
      setSelectedCode("");
      if (onChangeCode !== undefined) {
        onChangeCode("");
      }
    }
  }

  function handleContainerBlur(event: FocusEvent<HTMLDivElement>): void {
    const relatedTarget = event.relatedTarget as Node | null;

    if (
      relatedTarget === null ||
      event.currentTarget.contains(relatedTarget) === false
    ) {
      setIsOpen(false);
    }
  }

  function handleOptionMouseDown(
    event: MouseEvent<HTMLButtonElement>,
    optionCode: CountryCode,
    optionLabel: string,
  ): void {
    event.preventDefault();
    setSelectedCode(optionCode);
    setQuery(optionLabel);
    setIsOpen(false);

    if (onChangeCode !== undefined) {
      onChangeCode(optionCode);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm" onBlur={handleContainerBlur}>
      <Label htmlFor={inputId} isRequired={isRequired}>
        {label}
      </Label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          placeholder="Start typing a country..."
          autoComplete="off"
          value={query}
          onChange={handleInputChange}
          onFocus={(): void => {
            setIsOpen(true);
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen === true ? listboxId : undefined}
          aria-required={isRequired === true ? true : undefined}
          className="h-10 w-full rounded-md border border-primary bg-base px-3 text-sm text-primary placeholder:text-tertiary"
        />

        {/* Hidden field carrying the actual CountryCode enum value */}
        <input type="hidden" name={name} value={selectedCode} />

        {isOpen === true && filteredOptions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 z-10 mt-1 max-h-80 list-none overflow-y-auto rounded-md border border-primary bg-surface text-sm shadow-md"
          >
            {filteredOptions.map(
              (option: CountryOption): JSX.Element => (
                <li key={option.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedCode === option.code}
                    onMouseDown={(event): void =>
                      handleOptionMouseDown(event, option.code, option.label)
                    }
                    className="combobox-option flex w-full items-center px-3 py-1.5 text-left text-primary"
                  >
                    {option.label}
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
