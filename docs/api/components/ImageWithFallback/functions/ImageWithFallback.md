[**do-not-ghost-me**](../../../README.md)

***

# Function: ImageWithFallback()

> **ImageWithFallback**(`__namedParameters`): `Element`

Defined in: [src/components/ImageWithFallback.tsx:29](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/ImageWithFallback.tsx#L29)

Safe <Image> wrapper that swaps to a fallback image
if the original src fails to load.

- Keeps Next.js <Image> optimizations.
- Never re-tries the failing original src in a loop.
- Exposes the original URL via data-original-url when fallback is active.

## Parameters

### \_\_namedParameters

`ImageWithFallbackProps`

## Returns

`Element`
