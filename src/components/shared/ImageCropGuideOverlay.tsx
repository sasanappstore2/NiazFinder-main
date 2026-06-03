'use client';

import { cn } from '@/lib/utils';

/** Alignment guides inside the crop frame (grid, ruler ticks, twin circles). */
export function ImageCropGuideOverlay({
  width,
  height,
  className,
}: {
  width: number;
  height: number;
  className?: string;
}) {
  if (width <= 0 || height <= 0) return null;

  return (
    <div
      className={cn(
        'image-crop-guides pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2',
        className
      )}
      style={{ width, height }}
      aria-hidden
    >
      <div className="image-crop-guides__grid" />
      <div className="image-crop-guides__diagonals" />
      <div className="image-crop-guides__circle image-crop-guides__circle--outer" />
      <div className="image-crop-guides__circle image-crop-guides__circle--inner" />
      <div className="image-crop-guides__crosshair-h" />
      <div className="image-crop-guides__crosshair-v" />
      <div className="image-crop-guides__ticks image-crop-guides__ticks--top" />
      <div className="image-crop-guides__ticks image-crop-guides__ticks--bottom" />
      <div className="image-crop-guides__ticks image-crop-guides__ticks--start" />
      <div className="image-crop-guides__ticks image-crop-guides__ticks--end" />
    </div>
  );
}
