[**do-not-ghost-me**](../../../../README.md)

***

# Function: useIsMobile()

> **useIsMobile**(): `boolean`

Defined in: [src/components/ui/use-mobile.ts:87](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/components/ui/use-mobile.ts#L87)

Hook that reports whether the viewport is currently considered "mobile".

Uses `useSyncExternalStore` for:
- SSR safety (separate server/client snapshots)
- avoiding setState-in-effect warnings

## Returns

`boolean`

True when viewport width is below MOBILE_BREAKPOINT, false otherwise.
