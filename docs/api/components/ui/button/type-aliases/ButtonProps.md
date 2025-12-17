[**do-not-ghost-me**](../../../../README.md)

***

# Type Alias: ButtonProps

> **ButtonProps** = `React.ComponentProps`\<`"button"`\> & `VariantProps`\<*typeof* [`buttonVariants`](../variables/buttonVariants.md)\> & `object`

Defined in: [src/components/ui/button.tsx:86](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/ui/button.tsx#L86)

Props for the design-system Button component.

Extends the native `button` element props with visual variants,
size options and the `asChild` flag for Slot rendering.

## Type Declaration

### asChild?

> `optional` **asChild**: `boolean`

When true, renders the button styles on a child element via Radix Slot.
