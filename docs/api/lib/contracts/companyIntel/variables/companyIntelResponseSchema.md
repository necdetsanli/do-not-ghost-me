[**do-not-ghost-me**](../../../../README.md)

***

# Variable: companyIntelResponseSchema

> `const` **companyIntelResponseSchema**: `ZodUnion`\<readonly \[`ZodObject`\<\{ `company`: `ZodObject`\<\{ `canonicalId`: `ZodString`; `displayName`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `signals`: `ZodObject`\<\{ `confidence`: `ZodEnum`\<\{ `high`: `"high"`; `low`: `"low"`; `medium`: `"medium"`; \}\>; `reportCount90d`: `ZodNumber`; `reportCountTotal`: `ZodNumber`; `riskScore`: `ZodNullable`\<`ZodNumber`\>; \}, `$strip`\>; `updatedAt`: `ZodString`; \}, `$strip`\>, `ZodObject`\<\{ `status`: `ZodLiteral`\<`"insufficient_data"`\>; \}, `$strip`\>, `ZodObject`\<\{ `error`: `ZodString`; \}, `$strip`\>\]\>

Defined in: [src/lib/contracts/companyIntel.ts:185](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/contracts/companyIntel.ts#L185)

Union of all valid response bodies for GET /api/public/company-intel.
