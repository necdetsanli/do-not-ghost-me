[**do-not-ghost-me**](../../../../README.md)

***

# Variable: companyIntelRequestSchema

> `const` **companyIntelRequestSchema**: `ZodPipe`\<`ZodObject`\<\{ `key`: `ZodString`; `source`: `ZodPipe`\<`ZodTransform`\<`unknown`, `unknown`\>, `ZodEnum`\<\{ `domain`: `"domain"`; `glassdoor`: `"glassdoor"`; `indeed`: `"indeed"`; `linkedin`: `"linkedin"`; `workable`: `"workable"`; \}\>\>; \}, `$strip`\>, `ZodDiscriminatedUnion`\<\[`ZodObject`\<\{ `key`: `ZodPipe`\<`ZodString`, `ZodTransform`\<`string`, `string`\>\>; `source`: `ZodLiteral`\<`"domain"`\>; \}, `$strip`\>, `ZodObject`\<\{ `key`: `ZodPipe`\<`ZodString`, `ZodTransform`\<`string`, `string`\>\>; `source`: `ZodEnum`\<\{ `glassdoor`: `"glassdoor"`; `indeed`: `"indeed"`; `linkedin`: `"linkedin"`; `workable`: `"workable"`; \}\>; \}, `$strip`\>\], `"source"`\>\>

Defined in: [src/lib/contracts/companyIntel.ts:120](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/contracts/companyIntel.ts#L120)

Full request schema for GET /api/public/company-intel query parameters.
Uses a discriminated union to apply source-specific key validation.
