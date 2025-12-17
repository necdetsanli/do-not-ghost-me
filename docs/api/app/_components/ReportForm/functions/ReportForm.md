[**do-not-ghost-me**](../../../../README.md)

***

# Function: ReportForm()

> **ReportForm**(): `Element`

Defined in: [src/app/\_components/ReportForm.tsx:90](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/_components/ReportForm.tsx#L90)

Ghosting report form for the public home page.

Responsibilities:
- Render the main report submission form (company, stage, level, etc.).
- Perform minimal client-side guards (e.g. country selection).
- Submit the payload to the `/api/reports` endpoint as JSON.
- Handle success and error states, including honeypot success path.

Full validation, rate limiting and persistence are handled server-side
via Zod schemas and domain-specific logic.

## Returns

`Element`
