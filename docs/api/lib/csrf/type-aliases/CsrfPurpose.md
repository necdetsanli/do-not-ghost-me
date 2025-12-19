[**do-not-ghost-me**](../../../README.md)

***

# Type Alias: CsrfPurpose

> **CsrfPurpose** = `"admin-login"`

Defined in: [src/lib/csrf.ts:23](https://github.com/necdetsanli/do-not-ghost-me/blob/ca67b795423a5510bee17afefd943f2be855d7a2/src/lib/csrf.ts#L23)

Allowed CSRF token purposes.

Keeping this as a string literal union makes call sites explicit and
avoids accidental reuse of the same secret for unrelated contexts.
