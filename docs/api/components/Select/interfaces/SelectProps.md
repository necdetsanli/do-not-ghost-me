[**do-not-ghost-me**](../../../README.md)

***

# Interface: SelectProps

Defined in: [src/components/Select.tsx:26](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L26)

## Properties

### aria-required?

> `optional` **aria-required**: `string` \| `boolean`

Defined in: [src/components/Select.tsx:48](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L48)

HTML-style aria-required prop (for compatibility).

***

### containerClassName?

> `optional` **containerClassName**: `string`

Defined in: [src/components/Select.tsx:63](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L63)

Classes for layout/styling.

***

### contentClassName?

> `optional` **contentClassName**: `string`

Defined in: [src/components/Select.tsx:65](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L65)

***

### contentPosition?

> `optional` **contentPosition**: [`SelectContentPosition`](../type-aliases/SelectContentPosition.md)

Defined in: [src/components/Select.tsx:68](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L68)

Position strategy for dropdown content.

***

### defaultValue?

> `optional` **defaultValue**: `string`

Defined in: [src/components/Select.tsx:30](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L30)

Initial value for uncontrolled usage.

***

### description?

> `optional` **description**: `string`

Defined in: [src/components/Select.tsx:39](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L39)

Helper text shown under the control.

***

### disabled?

> `optional` **disabled**: `boolean`

Defined in: [src/components/Select.tsx:51](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L51)

Disable the whole select.

***

### errorMessage?

> `optional` **errorMessage**: `string`

Defined in: [src/components/Select.tsx:41](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L41)

Error message shown under the control.

***

### id?

> `optional` **id**: `string`

Defined in: [src/components/Select.tsx:54](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L54)

Id used to associate label and aria attributes.

***

### isRequired?

> `optional` **isRequired**: `boolean`

Defined in: [src/components/Select.tsx:44](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L44)

App-level required flag (preferred).

***

### label?

> `optional` **label**: `ReactNode`

Defined in: [src/components/Select.tsx:35](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L35)

Optional label shown above the control.

***

### name?

> `optional` **name**: `string`

Defined in: [src/components/Select.tsx:57](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L57)

Name used for a hidden <input> so values submit via HTML forms.

***

### onValueChange()?

> `optional` **onValueChange**: (`value`) => `void`

Defined in: [src/components/Select.tsx:32](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L32)

Called when the selected value changes.

#### Parameters

##### value

`string`

#### Returns

`void`

***

### options

> **options**: [`SelectOption`](SelectOption.md)[]

Defined in: [src/components/Select.tsx:60](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L60)

Options shown in the dropdown. Options with empty value are ignored.

***

### placeholder?

> `optional` **placeholder**: `string`

Defined in: [src/components/Select.tsx:37](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L37)

Placeholder shown when no value is selected.

***

### required?

> `optional` **required**: `boolean`

Defined in: [src/components/Select.tsx:46](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L46)

HTML-style required prop (for compatibility with existing usages).

***

### triggerClassName?

> `optional` **triggerClassName**: `string`

Defined in: [src/components/Select.tsx:64](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L64)

***

### value?

> `optional` **value**: `string`

Defined in: [src/components/Select.tsx:28](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/Select.tsx#L28)

Controlled value (if using as controlled component).
