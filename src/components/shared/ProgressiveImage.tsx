'use client';

import Image, { type ImageProps } from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_FULL_QUALITY = 86;
const DEFAULT_PLACEHOLDER_QUALITY = 20;

type ProgressiveImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
  placeholderQuality?: number;
  /** Width hint for the tiny placeholder request (Next.js `w` param). */
  placeholderWidth?: number;
} & Omit<ImageProps, 'src' | 'alt' | 'sizes' | 'quality' | 'priority' | 'placeholder'>;

/**
 * Blur-up progressive loader: a tiny optimized image paints immediately (FCP/LCP shell),
 * then the full-quality image crossfades in without a visible quality jump.
 */
export function ProgressiveImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
  quality = DEFAULT_FULL_QUALITY,
  placeholderQuality = DEFAULT_PLACEHOLDER_QUALITY,
  placeholderWidth = 48,
  fill,
  ...rest
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const onFullLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const placeholderSizes = `${placeholderWidth}px`;

  return (
    <>
      <Image
        {...rest}
        fill={fill}
        src={src}
        alt=""
        aria-hidden
        sizes={placeholderSizes}
        quality={placeholderQuality}
        draggable={false}
        className={cn(
          className,
          'pointer-events-none scale-[1.04] blur-[12px] brightness-[1.03] saturate-[1.05]',
          'transition-opacity duration-500 ease-out',
          loaded ? 'opacity-0' : 'opacity-100'
        )}
      />
      <Image
        {...rest}
        fill={fill}
        src={src}
        alt={alt}
        sizes={sizes}
        quality={quality}
        priority={priority}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        draggable={false}
        className={cn(
          className,
          'transition-opacity duration-500 ease-out',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={onFullLoad}
      />
    </>
  );
}
