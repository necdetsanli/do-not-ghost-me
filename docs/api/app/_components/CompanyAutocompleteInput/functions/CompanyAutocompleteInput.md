[**do-not-ghost-me**](../../../../README.md)

***

# Function: CompanyAutocompleteInput()

> **CompanyAutocompleteInput**(`props`): `Element`

Defined in: [src/app/\_components/CompanyAutocompleteInput.tsx:47](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_components/CompanyAutocompleteInput.tsx#L47)

Free-text company name input with best-effort autocomplete suggestions.

Responsibilities:
- Render a standard text input using the shared Input component.
- As the user types, fetch existing companies from the backend and display
  them in a small suggestions dropdown.
- Allow the user to either select an existing company or keep a custom
  free-text value. The actual payload remains a plain string.

This component does **not** perform any validation by itself; it simply
surfaces suggestions. Validation is handled by the server (Zod) and the
higher-level form component.

## Parameters

### props

`CompanyAutocompleteInputProps`

## Returns

`Element`
