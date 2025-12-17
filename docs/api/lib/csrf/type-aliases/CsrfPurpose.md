[**do-not-ghost-me**](../../../README.md)

***

# Type Alias: CsrfPurpose

> **CsrfPurpose** = `"admin-login"`

Defined in: [src/lib/csrf.ts:23](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/lib/csrf.ts#L23)

Allowed CSRF token purposes.

Keeping this as a string literal union makes call sites explicit and
avoids accidental reuse of the same secret for unrelated contexts.
