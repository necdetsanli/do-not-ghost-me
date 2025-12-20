// src/app/_components/CompanyAutocompleteInput.tsx
"use client";

import type { JSX, ChangeEvent, KeyboardEvent } from "react";
import { useId, useRef, useState } from "react";
import { Input } from "@/components/Input";

type CompanySuggestion = {
  id: string;
  name: string;
  country: string;
};

type CompanyAutocompleteInputProps = {
  /** HTML name attribute for the underlying input. */
  name: string;
  /** Label shown above the input via the shared Input component. */
  label: string;
  /** Current text value of the input. */
  value: string;
  /** Callback invoked whenever the input value changes. */
  onValueChange: (value: string) => void;
  /** Optional placeholder for the input element. */
  placeholder?: string;
  /** When true, marks the input as required in the UI. */
  required?: boolean;
  /** When true, shows the required asterisk in the shared Input component. */
  isRequired?: boolean;
  /** Maximum allowed length for the company name. */
  maxLength?: number;
};

/**
 * Free-text company name input with best-effort autocomplete suggestions.
 *
 * Responsibilities:
 * - Render a standard text input using the shared Input component.
 * - As the user types, fetch existing companies from the backend and display
 *   them in a small suggestions dropdown.
 * - Allow the user to either select an existing company or keep a custom
 *   free-text value. The actual payload remains a plain string.
 *
 * This component does **not** perform any validation by itself; it simply
 * surfaces suggestions. Validation is handled by the server (Zod) and the
 * higher-level form component.
 */
export function CompanyAutocompleteInput(props: CompanyAutocompleteInputProps): JSX.Element {
  const { name, label, value, onValueChange, placeholder, required, isRequired, maxLength } = props;

  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const debounceTimeoutRef = useRef<number | null>(null);
  const listboxId = useId();

  const hasSuggestions: boolean = suggestions.length > 0 && value.trim().length > 0;

  const activeOptionId: string | undefined =
    highlightedIndex !== null && suggestions[highlightedIndex] !== undefined
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  /**
   * Fetches company suggestions from the backend based on the current query.
   * A small debounce is applied in the caller to avoid excessive requests.
   *
   * @param query - The partial company name typed by the user.
   * @returns A promise that resolves when suggestions have been updated.
   */
  async function fetchSuggestions(query: string): Promise<void> {
    const trimmed: string = query.trim();

    if (trimmed.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(null);

      return;
    }

    try {
      setIsLoading(true);

      const response: Response = await fetch(
        `/api/companies/search?q=${encodeURIComponent(trimmed)}`,
      );

      if (response.ok !== true) {
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(null);

        return;
      }

      const data = (await response.json()) as CompanySuggestion[];

      setSuggestions(data);
      setIsOpen(data.length > 0);
      setHighlightedIndex(null);
    } catch {
      // Best-effort: on any failure, hide suggestions and continue.
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(null);
    } finally {
      setIsLoading(false);
    }

    return;
  }

  /**
   * Handles user input changes and schedules a debounced suggestions fetch.
   *
   * @param event - Change event from the underlying input.
   */
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextValue: string = event.target.value;
    onValueChange(nextValue);
    setHighlightedIndex(null);

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      void fetchSuggestions(nextValue);
    }, 200);
  }

  /**
   * Handles selection of a suggestion from the dropdown.
   *
   * @param suggestion - The company suggestion selected by the user.
   */
  function handleSuggestionSelect(suggestion: CompanySuggestion): void {
    onValueChange(suggestion.name);
    setIsOpen(false);
    setHighlightedIndex(null);
  }

  /**
   * Handles blur events from the input. A small delay is applied so that
   * clicks on suggestion items can be processed before the dropdown closes.
   */
  function handleBlur(): void {
    window.setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(null);
    }, 150);
  }

  /**
   * Handles key presses for keyboard navigation:
   * - ArrowDown / ArrowUp move the highlighted option.
   * - Enter selects the highlighted option when the list is open.
   * - Escape closes the list.
   *
   * @param event - Keyboard event from the input element.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(null);
      return;
    }

    if (event.key === "ArrowDown") {
      if (suggestions.length === 0) {
        return;
      }

      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) => {
        if (currentIndex === null) {
          return 0;
        }

        const nextIndex: number = currentIndex + 1;

        if (nextIndex >= suggestions.length) {
          return suggestions.length - 1;
        }

        return nextIndex;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      if (suggestions.length === 0) {
        return;
      }

      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) => {
        if (currentIndex === null) {
          return 0;
        }

        const nextIndex: number = currentIndex - 1;

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
        suggestions[highlightedIndex] !== undefined
      ) {
        event.preventDefault();

        const suggestion: CompanySuggestion = suggestions[highlightedIndex];
        handleSuggestionSelect(suggestion);
      }
    }
  }

  return (
    <div className="relative">
      <Input
        label={label}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        isRequired={isRequired}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen === true}
        aria-controls={hasSuggestions === true && isOpen === true ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
      />

      {isOpen === true && hasSuggestions === true ? (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-primary bg-surface shadow-md">
          <ul id={listboxId} role="listbox" className="divide-y divide-[var(--border-secondary)]">
            {isLoading === true ? (
              <li className="px-3 py-2 text-xs text-secondary">Loading suggestions…</li>
            ) : null}

            {isLoading === false
              ? suggestions.map((company, index) => {
                  const optionId: string = `${listboxId}-option-${index}`;
                  const isHighlighted: boolean = highlightedIndex === index;

                  return (
                    <li
                      key={company.id}
                      id={optionId}
                      role="option"
                      aria-selected={isHighlighted === true}
                      className="combobox-option flex items-center justify-between px-3 py-2 text-sm"
                      // onMouseDown: blur'dan önce çalışsın ve input değeri güncellensin
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSuggestionSelect(company);
                      }}
                    >
                      <span className="truncate font-medium">{company.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-tertiary">{company.country}</span>
                    </li>
                  );
                })
              : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
