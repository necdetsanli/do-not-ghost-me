[**do-not-ghost-me**](../../../../README.md)

***

# Function: cn()

> **cn**(...`inputs`): `string`

Defined in: [src/components/ui/utils.ts:14](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/ui/utils.ts#L14)

Merges arbitrary className inputs into a single Tailwind-safe string.

It uses `clsx` for conditional logic and `tailwind-merge` to resolve
conflicting Tailwind utilities (for example "px-2 px-4" → "px-4").

## Parameters

### inputs

...`ClassValue`[]

Class name values (strings, arrays, conditionals).

## Returns

`string`

A merged className string suitable for use as a React `className`.
