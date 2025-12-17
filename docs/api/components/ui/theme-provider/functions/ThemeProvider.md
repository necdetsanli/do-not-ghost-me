[**do-not-ghost-me**](../../../../README.md)

***

# Function: ThemeProvider()

> **ThemeProvider**(`__namedParameters`): `Element`

Defined in: [src/components/ui/theme-provider.tsx:26](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/ui/theme-provider.tsx#L26)

Application-level theme provider.

Wraps next-themes' ThemeProvider with sensible defaults:
- attribute="class" so Tailwind's `.dark` selector works correctly
- defaultTheme="system" to respect OS preference on first load
- enableSystem to keep the theme synced with OS when using "system"
- disableTransitionOnChange to avoid jarring CSS transitions on toggle

## Parameters

### \_\_namedParameters

`ThemeProviderProps`

## Returns

`Element`
