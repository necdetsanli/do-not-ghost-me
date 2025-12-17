[**do-not-ghost-me**](../../../../../README.md)

***

# Function: default()

> **default**(`props`): `Promise`\<`Element`\>

Defined in: [src/app/admin/login/page.tsx:34](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/admin/login/page.tsx#L34)

Admin login page.

Pure server component:
- Generates a CSRF token for the login form.
- Reads query params (e.g. ?error=1) to show error feedback.
- Renders a minimal, centered login card.
- Does not use client components (no "use client") to keep it simple and secure.

## Parameters

### props

`AdminLoginPageProps`

Page props including lazy searchParams.

## Returns

`Promise`\<`Element`\>

Admin login page JSX.
