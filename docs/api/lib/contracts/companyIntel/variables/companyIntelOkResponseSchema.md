[**do-not-ghost-me**](../../../../README.md)

***

# Variable: companyIntelOkResponseSchema

> `const` **companyIntelOkResponseSchema**: `ZodObject`\<\{ `company`: `ZodObject`\<\{ `canonicalId`: `ZodString`; `displayName`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `signals`: `ZodObject`\<\{ `confidence`: `ZodEnum`\<\{ `high`: `"high"`; `low`: `"low"`; `medium`: `"medium"`; \}\>; `reportCount90d`: `ZodNumber`; `reportCountTotal`: `ZodNumber`; `riskScore`: `ZodNullable`\<`ZodNumber`\>; \}, `$strip`\>; `updatedAt`: `ZodString`; \}, `$strip`\>

Defined in: [src/lib/contracts/companyIntel.ts:159](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/contracts/companyIntel.ts#L159)

Success payload schema for the endpoint.
