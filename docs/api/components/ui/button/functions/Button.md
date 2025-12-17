[**do-not-ghost-me**](../../../../README.md)

***

# Function: Button()

> **Button**(`props`): `Element`

Defined in: [src/components/ui/button.tsx:104](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/ui/button.tsx#L104)

Design-system button primitive.

- Supports multiple visual variants and sizes.
- Uses design tokens from global.css (background, text, focus ring, error colors).
- Can render as a different element when `asChild` is true (for links, etc.).

## Parameters

### props

[`ButtonProps`](../type-aliases/ButtonProps.md)

Button props including variant, size, className and asChild flag.

## Returns

`Element`

A styled button element or a Slot-wrapped child element.
