[**do-not-ghost-me**](../../../../README.md)

***

# Variable: companyIntelSignalsSchema

> `const` **companyIntelSignalsSchema**: `ZodObject`\<\{ `confidence`: `ZodEnum`\<\{ `high`: `"high"`; `low`: `"low"`; `medium`: `"medium"`; \}\>; `reportCount90d`: `ZodNumber`; `reportCountTotal`: `ZodNumber`; `riskScore`: `ZodNullable`\<`ZodNumber`\>; \}, `$strip`\>

Defined in: [src/lib/contracts/companyIntel.ts:149](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/contracts/companyIntel.ts#L149)

Schema describing the signals block returned by the endpoint.
