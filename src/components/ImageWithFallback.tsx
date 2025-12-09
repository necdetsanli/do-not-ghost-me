// src/app/components/ImageWithFallback.tsx
"use client";

import type { JSX, SyntheticEvent } from "react";
import { useCallback, useState } from "react";
import Image, { type ImageProps } from "next/image";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

type ImageWithFallbackProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
};

/**
 * Safe <Image> wrapper that swaps to an inline SVG placeholder
 * if the original image fails to load.
 */
export function ImageWithFallback(props: ImageWithFallbackProps): JSX.Element {
  const { src, alt, onError, ...rest } = props;
  const [didError, setDidError] = useState<boolean>(false);

  const handleError: NonNullable<ImageProps["onError"]> = useCallback(
    (event: SyntheticEvent<HTMLImageElement>): void => {
      setDidError(true);

      if (typeof onError === "function") {
        onError(event);
      }
    },
    [onError],
  );

  const effectiveSrc: string = didError === true ? ERROR_IMG_SRC : src;

  return (
    <Image
      {...rest}
      src={effectiveSrc}
      alt={alt}
      onError={handleError}
      data-original-url={didError === true ? src : undefined}
    />
  );
}
