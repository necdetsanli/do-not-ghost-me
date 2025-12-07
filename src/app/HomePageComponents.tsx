"use client";

import type {
  JSX,
  CSSProperties,
  ChangeEvent,
  FocusEvent,
  MouseEvent,
} from "react";
import { useState } from "react";
import type { CountryCode } from "@prisma/client";
import { COUNTRY_OPTIONS, labelForCountry } from "@/lib/enums";

/**
 * Shared label + control layout for the home page form.
 */
export const homeFormLabelStyle: CSSProperties = {
  display: "grid",
  gap: "0.25rem",
};

/**
 * Base style for text inputs on the home page form.
 */
export const homeInputStyle: CSSProperties = {
  padding: "0.5rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  width: "100%",
  fontSize: "0.9rem",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: "0.25rem",
  maxHeight: "14rem",
  overflowY: "auto",
  backgroundColor: "#ffffff",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  boxShadow: "0 8px 16px rgba(15, 23, 42, 0.12)",
  zIndex: 10,
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const optionButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "0.35rem 0.5rem",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "0.9rem",
};

/**
 * Props for the CountrySelect component.
 */
type CountrySelectProps = {
  /**
   * Name of the hidden input that will carry the selected CountryCode
   * in the form POST body (e.g. "country").
   */
  name: string;
  /**
   * Optional id to associate the visible text input with an external label.
   */
  id?: string;

  /**
   * Optional callback: informs parent about the currently selected CountryCode.
   * Used by the form to do client-side validation / reset logic.
   */
  onChangeCode?: (code: CountryCode | "") => void;
};

/**
 * CountrySelect renders a simple type-ahead country picker backed by CountryCode enums.
 *
 * Behaviour:
 * - Users type a few letters of the country name (e.g. "Ger").
 * - The dropdown ONLY shows countries whose labels START WITH the query
 *   (so "Ger" matches "Germany" but not "Algeria" or "Nigeria").
 * - When a country is chosen, the visible input displays its human label
 *   and a hidden <input name={name}> stores the ISO CountryCode value
 *   (e.g. "DE") so the surrounding <form> can submit it via FormData.
 */
export function CountrySelect({
  name,
  id,
  onChangeCode,
}: CountrySelectProps): JSX.Element {
  const [query, setQuery] = useState<string>("");
  const [selectedCode, setSelectedCode] = useState<CountryCode | "">("");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const normalizedQuery = query.trim().toLowerCase();

  const options = COUNTRY_OPTIONS.map((code) => ({
    code,
    label: labelForCountry(code),
  }));

  const filteredOptions = options.filter((option) => {
    if (normalizedQuery === "") {
      // With empty query, show the full list (clipped below).
      return true;
    }
    // Strict prefix match: only labels that START WITH the query.
    return option.label.toLowerCase().startsWith(normalizedQuery);
  });

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    setQuery(value);
    setIsOpen(true);

    // User started typing again → clear previous selection.
    if (selectedCode !== "") {
      setSelectedCode("");
      if (onChangeCode !== undefined) {
        onChangeCode("");
      }
    }
  }

  function handleContainerBlur(event: FocusEvent<HTMLDivElement>): void {
    const relatedTarget = event.relatedTarget as Node | null;

    // Close the dropdown when focus leaves the whole component.
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
    // Prevent the input from blurring before we commit the selection.
    event.preventDefault();
    setSelectedCode(optionCode);
    setQuery(optionLabel);
    setIsOpen(false);

    if (onChangeCode !== undefined) {
      onChangeCode(optionCode);
    }
  }

  return (
    <div style={homeFormLabelStyle} onBlur={handleContainerBlur}>
      <span>Country</span>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type="text"
          placeholder="Start typing a country..."
          autoComplete="off"
          value={query}
          onChange={handleInputChange}
          onFocus={(): void => {
            setIsOpen(true);
          }}
          style={homeInputStyle}
        />
        {/* Hidden field carrying the actual CountryCode enum value */}
        <input type="hidden" name={name} value={selectedCode} />

        {isOpen === true && filteredOptions.length > 0 && (
          <ul style={dropdownStyle}>
            {filteredOptions.slice(0, 20).map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  onMouseDown={(event): void =>
                    handleOptionMouseDown(event, option.code, option.label)
                  }
                  style={optionButtonStyle}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
