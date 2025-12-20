// src/components/ui/use-mobile.ts
"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT: number = 768;
const MOBILE_MEDIA_QUERY: string = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Subscribes to viewport changes using a matchMedia listener.
 * Returns an unsubscribe function; on platforms without matchMedia,
 * it returns a no-op.
 *
 * @param onStoreChange - Callback invoked when the media query match state changes.
 * @returns An unsubscribe function that removes the media query listener when called.
 */
function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const mediaQueryList: MediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);

  const handleChange = (): void => {
    onStoreChange();
  };

  // Modern browsers
  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }

  // Legacy browsers (older Safari, etc.)
  if (typeof mediaQueryList.addListener === "function") {
    mediaQueryList.addListener(handleChange);

    return () => {
      mediaQueryList.removeListener(handleChange);
    };
  }

  return () => {};
}

/**
 * Client-side snapshot: returns true when the current viewport width
 * matches the "mobile" media query.
 *
 * @returns True if viewport is below MOBILE_BREAKPOINT, false otherwise.
 */
function getSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

/**
 * Server-side snapshot: always returns false to keep hydration consistent.
 *
 * @returns False, as the server cannot know the client viewport size.
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook that reports whether the viewport is currently considered "mobile".
 *
 * Uses `useSyncExternalStore` for:
 * - SSR safety (separate server/client snapshots)
 * - avoiding setState-in-effect warnings
 *
 * @returns True when viewport width is below MOBILE_BREAKPOINT, false otherwise.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
