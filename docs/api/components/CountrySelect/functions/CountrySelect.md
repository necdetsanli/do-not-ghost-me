[**do-not-ghost-me**](../../../README.md)

***

# Function: CountrySelect()

> **CountrySelect**(`__namedParameters`): `Element`

Defined in: [src/components/CountrySelect.tsx:93](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/CountrySelect.tsx#L93)

CountrySelect renders a simple type-ahead country picker backed by CountryCode enums.

Behaviour:
- Users type a few letters of the country name (e.g. "Ger").
- The dropdown shows countries whose labels start with the query.
- When a country is chosen, the visible input displays its human label
  and a hidden <input name={name}> stores the CountryCode value.

Keyboard support:
- ArrowDown / ArrowUp: move the active option while the list is open.
- Enter: select the active option when the list is open.
- Escape: close the list without changing the selection.

## Parameters

### \_\_namedParameters

`CountrySelectProps`

## Returns

`Element`
