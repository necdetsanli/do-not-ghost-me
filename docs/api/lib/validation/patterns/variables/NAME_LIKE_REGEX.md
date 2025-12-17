[**do-not-ghost-me**](../../../../README.md)

***

# Variable: NAME\_LIKE\_REGEX

> `const` **NAME\_LIKE\_REGEX**: `RegExp`

Defined in: [src/lib/validation/patterns.ts:16](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/validation/patterns.ts#L16)

Shared regular expression for values that look like a "name", such as:
- Company name
- Position detail

Allowed characters:
- Unicode letters and digits
- Spaces
- A limited set of safe symbols: / # + - _ & ( ) ' " . ,

## Returns

A regular expression that can be used to validate name-like strings.
