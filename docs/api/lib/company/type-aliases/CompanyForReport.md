[**do-not-ghost-me**](../../../README.md)

***

# Type Alias: CompanyForReport

> **CompanyForReport** = `object`

Defined in: [src/lib/company.ts:16](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/company.ts#L16)

Minimal shape of a company record as used in the API layer.

Notes:
- Company is now scoped by (normalizedName, country).
- The same normalized name may exist in multiple countries,
  but only once per (normalizedName, country) pair.

## Properties

### country

> **country**: `CountryCode`

Defined in: [src/lib/company.ts:20](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/company.ts#L20)

***

### id

> **id**: `string`

Defined in: [src/lib/company.ts:17](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/company.ts#L17)

***

### name

> **name**: `string`

Defined in: [src/lib/company.ts:18](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/company.ts#L18)

***

### normalizedName

> **normalizedName**: `string`

Defined in: [src/lib/company.ts:19](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/company.ts#L19)
