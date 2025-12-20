// src/components/CountrySelect.tsx
"use client";

import type { JSX, ChangeEvent, FocusEvent, MouseEvent, KeyboardEvent } from "react";
import { useId, useState } from "react";
import type { CountryCode } from "@prisma/client";
import { COUNTRY_OPTIONS, labelForCountry } from "@/lib/enums";
import { Label } from "@/components/Label";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";

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
 * Precomputed country options, sorted once at module load.
 */
const SORTED_COUNTRY_OPTIONS: CountryOption[] = COUNTRY_OPTIONS.map(
  (code: CountryCode): CountryOption => ({
    code,
    label: labelForCountry(code),
  }),
).sort((a: CountryOption, b: CountryOption): number => a.label.localeCompare(b.label));

/**
 * Pure helper: filter countries by the given query (startsWith, case-insensitive).
 */
function filterCountries(query: string): CountryOption[] {
  const normalizedQuery: string = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return SORTED_COUNTRY_OPTIONS;
  }

  return SORTED_COUNTRY_OPTIONS.filter((option: CountryOption): boolean =>
    option.label.toLowerCase().startsWith(normalizedQuery),
  );
}

/**
 * CountrySelect renders a simple type-ahead country picker backed by CountryCode enums.
 *
 * Behaviour:
 * - Users type a few letters of the country name (e.g. "Ger").
 * - The dropdown shows countries whose labels start with the query.
 * - When a country is chosen, the visible input displays its human label
 *   and a hidden <input name={name}> stores the CountryCode value.
 *
 * Keyboard support:
 * - ArrowDown / ArrowUp: move the active option while the list is open.
 * - Enter: select the active option when the list is open.
 * - Escape: close the list without changing the selection.
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

  const [selectedCode, setSelectedCode] = useState<CountryCode | "">(initialCode ?? "");

  const initialLabel: string =
    initialCode !== undefined && initialCode !== ""
      ? (SORTED_COUNTRY_OPTIONS.find(
          (option: CountryOption): boolean => option.code === initialCode,
        )?.label ?? "")
      : "";

  const [query, setQuery] = useState<string>(initialLabel);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const filteredOptions: CountryOption[] = filterCountries(query);
  const filteredLength: number = filteredOptions.length;

  const activeOptionId: string | undefined =
    isOpen === true && highlightedIndex !== null && filteredOptions[highlightedIndex] !== undefined
      ? `${inputId}-option-${filteredOptions[highlightedIndex].code}`
      : undefined;

  function notifyChange(nextCode: CountryCode | ""): void {
    if (onChangeCode !== undefined) {
      onChangeCode(nextCode);
    }
  }

  function selectOption(optionCode: CountryCode, optionLabel: string): void {
    setSelectedCode(optionCode);
    setQuery(optionLabel);
    setIsOpen(false);
    setHighlightedIndex(null);
    notifyChange(optionCode);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const value: string = event.target.value;
    setQuery(value);

    const nextFiltered: CountryOption[] = filterCountries(value);

    setIsOpen(true);

    if (selectedCode !== "") {
      setSelectedCode("");
      notifyChange("");
    }

    if (nextFiltered.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(null);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (isOpen !== true) {
        if (filteredLength > 0) {
          setIsOpen(true);
          setHighlightedIndex(0);
        }
        return;
      }

      if (filteredLength === 0) {
        return;
      }

      setHighlightedIndex((previousIndex: number | null): number | null => {
        if (previousIndex === null) {
          return 0;
        }

        const nextIndex: number = previousIndex + 1;
        if (nextIndex >= filteredLength) {
          return filteredLength - 1;
        }

        return nextIndex;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (isOpen !== true) {
        if (filteredLength > 0) {
          setIsOpen(true);
          setHighlightedIndex(filteredLength - 1);
        }
        return;
      }

      if (filteredLength === 0) {
        return;
      }

      setHighlightedIndex((previousIndex: number | null): number | null => {
        if (previousIndex === null) {
          return filteredLength - 1;
        }

        const nextIndex: number = previousIndex - 1;
        if (nextIndex < 0) {
          return 0;
        }

        return nextIndex;
      });

      return;
    }

    if (event.key === "Enter") {
      if (
        isOpen === true &&
        highlightedIndex !== null &&
        filteredOptions[highlightedIndex] !== undefined
      ) {
        event.preventDefault();

        const option: CountryOption = filteredOptions[highlightedIndex];
        selectOption(option.code, option.label);
      }

      return;
    }

    if (event.key === "Escape") {
      if (isOpen === true) {
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(null);
      }
    }
  }

  function handleContainerBlur(event: FocusEvent<HTMLDivElement>): void {
    const relatedTarget = event.relatedTarget as Node | null;

    if (relatedTarget === null || event.currentTarget.contains(relatedTarget) === false) {
      setIsOpen(false);
      setHighlightedIndex(null);
    }
  }

  function handleOptionMouseDown(
    event: MouseEvent<HTMLButtonElement>,
    optionCode: CountryCode,
    optionLabel: string,
  ): void {
    // Prevent the input from losing focus before we update the state.
    event.preventDefault();
    selectOption(optionCode, optionLabel);
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm" onBlur={handleContainerBlur}>
      <Label htmlFor={inputId} isRequired={isRequired}>
        {label}
      </Label>

      <div className="relative">
        <Input
          id={inputId}
          type="text"
          placeholder="Start typing a country..."
          autoComplete="off"
          value={query}
          onChange={handleInputChange}
          onFocus={(): void => {
            setIsOpen(true);
            if (filteredLength > 0) {
              setHighlightedIndex(0);
            } else {
              setHighlightedIndex(null);
            }
          }}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen === true}
          aria-controls={isOpen === true ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-required={isRequired === true ? true : undefined}
          className={cn("h-10 md:h-9")}
        />

        {/* Hidden field carrying the actual CountryCode enum value */}
        <input type="hidden" name={name} value={selectedCode} />

        {isOpen === true && filteredLength > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 z-10 mt-1 max-h-80 list-none overflow-y-auto rounded-md border border-primary bg-surface text-sm shadow-md"
          >
            {filteredOptions.map((option: CountryOption, index: number): JSX.Element => {
              const isHighlighted: boolean = highlightedIndex === index && isOpen === true;
              const isSelected: boolean = selectedCode === option.code;

              return (
                <li key={option.code}>
                  <button
                    id={`${inputId}-option-${option.code}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-highlighted={isHighlighted === true ? "true" : null}
                    onMouseDown={(event): void =>
                      handleOptionMouseDown(event, option.code, option.label)
                    }
                    className={cn(
                      "combobox-option flex w-full items-center px-3 py-2 text-left text-primary",
                      "data-[highlighted=true]:bg-surface-hover data-[highlighted=true]:text-primary",
                      "dark:data-[highlighted=true]:bg-[rgba(79,70,229,0.25)] dark:data-[highlighted=true]:text-[#e5e7eb]",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
