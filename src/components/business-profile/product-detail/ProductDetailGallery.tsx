'use client';

import { useCallback, useState } from 'react';
import { ImageIcon, ZoomIn } from 'lucide-react';
import { ProgressiveImage } from '@/components/shared/ProgressiveImage';
import { cn } from '@/lib/utils';
import {
  PRODUCT_GALLERY_SQUARE,
  PRODUCT_IMAGE_CONTAIN,
  PRODUCT_THUMB_SIZE,
} from './product-detail-tokens';
import { ProductImageLightbox } from './ProductImageLightbox';

export function ProductDetailGallery({
  images,
  title,
  activeIndex,
  onActiveIndexChange,
}: {
  images: string[];
  title: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const mainImage = images[activeIndex] ?? images[0];
  const hasImages = images.length > 0;

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleLightboxIndexChange = useCallback(
    (index: number) => {
      setLightboxIndex(index);
      onActiveIndexChange(index);
    },
    [onActiveIndexChange]
  );

  return (
    <div className="space-y-[13px]" dir="rtl">
      <button
        type="button"
        onClick={() => hasImages && openLightbox(activeIndex)}
        disabled={!hasImages}
        className={cn(
          PRODUCT_GALLERY_SQUARE,
          'group mx-auto block w-full max-w-[min(100%,34rem)] cursor-zoom-in transition hover:border-emerald-500/30 lg:mx-0 lg:max-w-none',
          !hasImages && 'cursor-default'
        )}
        aria-label={hasImages ? 'بزرگ‌نمایی تصویر' : 'بدون تصویر'}
      >
        {mainImage ? (
          <>
            <ProgressiveImage
              src={mainImage}
              alt={title}
              fill
              className={cn(PRODUCT_IMAGE_CONTAIN, 'transition duration-300 group-hover:scale-[1.02]')}
              sizes="(max-width: 1024px) 100vw, 61vw"
              priority
            />
            <span className="absolute bottom-[13px] left-[13px] flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
              <ZoomIn className="size-3.5" aria-hidden />
              بزرگ‌نمایی
            </span>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="size-12 opacity-40" aria-hidden />
            <span className="text-sm">بدون تصویر</span>
          </div>
        )}
        {hasImages && images.length > 1 && (
          <span className="absolute top-[13px] left-[13px] rounded-full bg-background/85 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground shadow-sm backdrop-blur">
            {(activeIndex + 1).toLocaleString('fa-IR')} / {images.length.toLocaleString('fa-IR')}
          </span>
        )}
      </button>

      {images.length > 1 && (
        <div
          className="flex gap-[8px] overflow-x-auto pb-1 scrollbar-thin"
          role="tablist"
          aria-label="تصاویر محصول"
        >
          {images.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => onActiveIndexChange(i)}
              onDoubleClick={() => openLightbox(i)}
              className={cn(
                'relative shrink-0 overflow-hidden rounded-xl border-2 bg-muted/40 transition',
                PRODUCT_THUMB_SIZE,
                i === activeIndex
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-transparent opacity-75 hover:opacity-100'
              )}
            >
              <ProgressiveImage
                src={url}
                alt=""
                fill
                className="object-contain p-1.5"
                sizes="80px"
                quality={78}
                placeholderWidth={32}
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <ProductImageLightbox
          images={images}
          title={title}
          index={lightboxIndex}
          onIndexChange={handleLightboxIndexChange}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
