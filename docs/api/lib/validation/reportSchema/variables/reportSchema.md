[**do-not-ghost-me**](../../../../README.md)

***

# Variable: reportSchema

> `const` **reportSchema**: `ZodObject`\<\{ `companyName`: `ZodString`; `country`: `ZodEnum`\<\{ \}\>; `daysWithoutReply`: `ZodPipe`\<`ZodTransform`\<`number` \| `undefined`, `unknown`\>, `ZodOptional`\<`ZodNumber`\>\>; `honeypot`: `ZodOptional`\<`ZodString`\>; `jobLevel`: `ZodEnum`\<\{ \}\>; `positionCategory`: `ZodEnum`\<\{ \}\>; `positionDetail`: `ZodString`; `stage`: `ZodEnum`\<\{ \}\>; \}, `$strip`\>

Defined in: [src/lib/validation/reportSchema.ts:85](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/validation/reportSchema.ts#L85)

Zod schema for the public "ghosting report" payload.

This schema is the single source of truth for validation and is shared
between the API route and any client-side validation logic.

Fields:
- companyName: human-readable company name (2..120 chars, safe charset).
- stage: pipeline stage (enum Stage).
- jobLevel: seniority (enum JobLevel).
- positionCategory: coarse role category (enum PositionCategory).
- positionDetail: short free-text position label (2..80 chars).
- daysWithoutReply: optional integer in [1, 365] when provided.
- country: ISO 3166-1 alpha-2 country code (enum CountryCode), required.
- honeypot: hidden anti-bot field, must be empty when present.
