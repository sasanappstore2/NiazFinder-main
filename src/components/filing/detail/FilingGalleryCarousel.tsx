'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilingImageLightbox } from './FilingImageLightbox';

type Props = {
  images: string[];
  alt?: string;
  className?: string;
  fileCode?: string;
};

const DRAG_THRESHOLD_PX = 8;

function nearestSlideIndex(viewport: HTMLElement): number {
  const slides = viewport.querySelectorAll<HTMLElement>('.filing-gallery-carousel__slide');
  if (!slides.length) return 0;

  const rtl = getComputedStyle(viewport).direction === 'rtl';
  const viewportRect = viewport.getBoundingClientRect();
  const anchor = rtl
    ? viewportRect.right - viewportRect.width * 0.08
    : viewportRect.left + viewportRect.width * 0.08;

  let best = 0;
  let bestDist = Infinity;
  slides.forEach((slide, i) => {
    const slideRect = slide.getBoundingClientRect();
    const slideAnchor = rtl ? slideRect.right : slideRect.left;
    const dist = Math.abs(slideAnchor - anchor);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function countSlidesInView(viewport: HTMLElement): number {
  const slides = viewport.querySelectorAll<HTMLElement>('.filing-gallery-carousel__slide');
  if (!slides.length) return 1;

  const viewportRect = viewport.getBoundingClientRect();
  let visible = 0;
  slides.forEach((slide) => {
    const rect = slide.getBoundingClientRect();
    const overlap = Math.min(rect.right, viewportRect.right) - Math.max(rect.left, viewportRect.left);
    if (overlap > rect.width * 0.45) visible += 1;
  });
  return Math.max(1, visible);
}

export function FilingGalleryCarousel({ images, alt = '', className, fileCode }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slidesInView, setSlidesInView] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const count = images.length;
  const maxIndex = Math.max(0, count - slidesInView);
  const canSlide = count > slidesInView;

  const syncFromScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setSelectedIndex(nearestSlideIndex(viewport));
    setSlidesInView(countSlidesInView(viewport));
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    syncFromScroll();
    const ro = new ResizeObserver(syncFromScroll);
    ro.observe(viewport);

    const onScroll = () => syncFromScroll();
    viewport.addEventListener('scroll', onScroll, { passive: true });
    viewport.addEventListener('scrollend', onScroll);

    return () => {
      ro.disconnect();
      viewport.removeEventListener('scroll', onScroll);
      viewport.removeEventListener('scrollend', onScroll);
    };
  }, [count, syncFromScroll]);

  const scrollToIndex = useCallback((index: number) => {
    const slide = slideRefs.current[index];
    slide?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  }, []);

  const scrollBy = useCallback(
    (delta: number) => {
      const next = Math.min(maxIndex, Math.max(0, selectedIndex + delta));
      scrollToIndex(next);
    },
    [maxIndex, scrollToIndex, selectedIndex]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollBy(-1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollBy(1);
      }
    },
    [scrollBy]
  );

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    if ((event.target as HTMLElement).closest('.filing-gallery-carousel__tile')) return;

    const viewport = viewportRef.current;
    if (!viewport) return;
    suppressClickRef.current = false;
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startScroll: viewport.scrollLeft,
      pointerId: event.pointerId,
    };
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag?.active || !viewport || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      suppressClickRef.current = true;
    }
    const rtl = getComputedStyle(viewport).direction === 'rtl';
    viewport.scrollLeft = rtl ? drag.startScroll + dx : drag.startScroll - dx;
  }, []);

  const endPointerDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag?.active || !viewport || drag.pointerId !== event.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
    viewport.classList.remove('is-dragging');
    viewport.releasePointerCapture(event.pointerId);
    syncFromScroll();
    if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }, [syncFromScroll]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  if (count === 0) return null;

  const rangeEnd = Math.min(selectedIndex + slidesInView, count);

  return (
    <div className={cn('filing-gallery-carousel', className)}>
      <div className="filing-gallery-carousel__stage">
        <div
          ref={viewportRef}
          className="filing-gallery-carousel__viewport"
          tabIndex={canSlide ? 0 : undefined}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          aria-roledescription="carousel"
        >
          <div className="filing-gallery-carousel__track">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                className="filing-gallery-carousel__slide"
              >
                <button
                  type="button"
                  className="filing-gallery-carousel__tile"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    openLightbox(i);
                  }}
                  aria-label={`بزرگ‌نمایی تصویر ${i + 1}`}
                >
                  <Image
                    src={src}
                    alt={i === 0 ? alt : ''}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 21rem, 34rem"
                    priority={i === 0}
                    draggable={false}
                  />
                  <span className="filing-gallery-carousel__zoom-hint" aria-hidden>
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                    </svg>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {canSlide ? (
          <>
            <button
              type="button"
              className="filing-gallery-carousel__nav filing-gallery-carousel__nav--prev"
              onClick={() => scrollBy(-1)}
              disabled={selectedIndex <= 0}
              aria-label="تصاویر قبلی"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              type="button"
              className="filing-gallery-carousel__nav filing-gallery-carousel__nav--next"
              onClick={() => scrollBy(1)}
              disabled={selectedIndex >= maxIndex}
              aria-label="تصاویر بعدی"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="filing-gallery-carousel__counter" aria-live="polite">
              {slidesInView > 1
                ? `${selectedIndex + 1}–${rangeEnd} / ${count}`
                : `${selectedIndex + 1} / ${count}`}
            </span>
          </>
        ) : null}
      </div>

      {lightboxOpen ? (
        <FilingImageLightbox
          images={images}
          title={alt || 'تصاویر ملک'}
          fileCode={fileCode}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
