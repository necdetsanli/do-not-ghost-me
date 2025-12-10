[**do-not-ghost-me**](../../../../README.md)

***

# Function: containsAtLeastOneLetter()

> **containsAtLeastOneLetter**(`value`): `boolean`

Defined in: [src/lib/validation/patterns.ts:25](https://github.com/necdetsanli/do-not-ghost-me/blob/f815d119d02b97ec11bd28b7513de788a5e5222e/src/lib/validation/patterns.ts#L25)

Checks whether a string contains at least one letter.
Uses Unicode property escapes so it works for non-ASCII alphabets as well.

## Parameters

### value

`string`

The input string to inspect.

## Returns

`boolean`

True if the string contains at least one Unicode letter, false otherwise.
