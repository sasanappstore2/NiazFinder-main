'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceTier } from '@/hooks/use-device-tier';
import { toPersianDigits } from '@/lib/format/digits';
import { cn } from '@/lib/utils';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.35;

type Props = {
  images: string[];
  title: string;
  fileCode?: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

function filenameFromUrl(url: string, title: string, index: number): string {
  const base = url.split('/').pop()?.split('?')[0] || '';
  if (base.includes('.')) return base;
  const safe = title.replace(/[^\w\u0600-\u06FF-]+/g, '-').slice(0, 40) || 'filing';
  return `${safe}-${index + 1}.jpg`;
}

export function FilingImageLightbox({
  images,
  title,
  fileCode,
  index,
  onIndexChange,
  onClose,
}: Props) {
  const tier = useDeviceTier();
  const isPhone = tier === 'phone';
  const isTablet = tier === 'tablet';
  const isHandheld = isPhone || isTablet;

  const url = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [draggingDismiss, setDraggingDismiss] = useState(false);
  const [liveTransform, setLiveTransform] = useState(false);
  const [mounted, setMounted] = useState(false);

  const panRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const touchRef = useRef<{
    x: number;
    y: number;
    t: number;
    pinchDist?: number;
    pinchScale?: number;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    resetTransform();
  }, [index, resetTransform]);

  useEffect(() => {
    const active = filmstripRef.current?.querySelector<HTMLElement>('.filing-lightbox__thumb.is-active');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scale > 1) resetTransform();
        else onClose();
      }
      if (scale <= 1) {
        if (e.key === 'ArrowRight') goPrev();
        if (e.key === 'ArrowLeft') goNext();
      }
      if (!isHandheld && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
      }
      if (!isHandheld && e.key === '-') {
        e.preventDefault();
        setScale((s) => {
          const next = Math.max(MIN_SCALE, s - ZOOM_STEP);
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      }
      if (e.key === '0') resetTransform();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext, scale, resetTransform, isHandheld]);

  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const root = lightboxRef.current;
    if (!root || isPhone) return;

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.filing-lightbox__filmstrip')) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((s) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta));
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [isPhone]);

  const clampPan = useCallback((x: number, y: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const el = viewportRef.current;
    const maxX = el ? (el.clientWidth * (s - 1)) / 2 : 200;
    const maxY = el ? (el.clientHeight * (s - 1)) / 2 : 200;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const handleDownload = async () => {
    if (!url) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filenameFromUrl(url, title, index);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const onDoubleClick = () => {
    if (scale > 1) resetTransform();
    else setScale(isPhone ? 2.25 : 2.5);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setLiveTransform(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!panRef.current || scale <= 1) return;
    const dx = e.clientX - panRef.current.x;
    const dy = e.clientY - panRef.current.y;
    setPan(clampPan(panRef.current.px + dx, panRef.current.py + dy, scale));
  };

  const onPointerUp = () => {
    panRef.current = null;
    setLiveTransform(false);
  };

  const pinchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const a = touches[0]!;
    const b = touches[1]!;
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchRef.current = {
        x: 0,
        y: 0,
        t: Date.now(),
        pinchDist: pinchDistance(e.touches),
        pinchScale: scale,
      };
      setLiveTransform(true);
      return;
    }
    const t = e.touches[0]!;
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    if (scale <= 1 && isHandheld) setDraggingDismiss(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current?.pinchDist) {
      const ratio = pinchDistance(e.touches) / touchRef.current.pinchDist;
      const base = touchRef.current.pinchScale ?? 1;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, base * ratio));
      setScale(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return;
    }
    if (!touchRef.current || scale > 1) return;
    const t = e.touches[0]!;
    const dy = t.clientY - touchRef.current.y;
    const dx = t.clientX - touchRef.current.x;
    if (isHandheld && scale <= 1 && Math.abs(dy) > Math.abs(dx)) setDragY(dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchRef.current?.pinchDist) {
      touchRef.current = null;
      setLiveTransform(false);
      return;
    }
    if (!touchRef.current) return;
    const t = e.changedTouches[0]!;
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    touchRef.current = null;
    setDraggingDismiss(false);

    if (scale <= 1) {
      if (isHandheld && Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx)) {
        onClose();
        setDragY(0);
        return;
      }
      if (Math.abs(dx) > 48 && dt < 400 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) goPrev();
        else goNext();
      }
    }
    setDragY(0);
  };

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(MIN_SCALE, s - ZOOM_STEP);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });

  if (!url || !mounted) return null;

  const dismissOpacity = scale > 1 ? 1 : Math.max(0.35, 1 - Math.abs(dragY) / 280);
  const zoomPercent = toPersianDigits(Math.round(scale * 100));

  const hintText = isPhone
    ? 'کشیدن چپ/راست · پایین برای بستن · پینچ برای زوم'
    : isTablet
      ? 'سوایپ افقی · کشیدن پایین برای بستن · دوبار لمس برای زوم'
      : 'کلیدهای جهت · اسکرول برای زوم · دوبار کلیک · Esc برای بستن';

  const content = (
    <div
      ref={lightboxRef}
      className={cn('filing-lightbox', isPhone && 'filing-lightbox--phone', isTablet && 'filing-lightbox--tablet')}
      role="dialog"
      aria-modal="true"
      aria-label={`گالری تصاویر — ${title}`}
    >
      <div
        className="filing-lightbox__backdrop"
        style={{ opacity: dismissOpacity }}
        onClick={scale <= 1 ? onClose : resetTransform}
        aria-hidden
      />

      <header className="filing-lightbox__header">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="filing-lightbox__icon-btn"
          onClick={onClose}
          aria-label="بستن"
        >
          <X className="size-5" />
        </Button>

        <div className="filing-lightbox__title-block" dir="rtl">
          <p className="filing-lightbox__title">{title}</p>
          <p className="filing-lightbox__meta">
            {images.length > 1 ? (
              <span>
                {toPersianDigits(index + 1)} / {toPersianDigits(images.length)}
              </span>
            ) : null}
            {fileCode ? (
              <span>
                {images.length > 1 ? ' · ' : ''}
                کد {toPersianDigits(fileCode)}
              </span>
            ) : null}
          </p>
        </div>

        <div className="filing-lightbox__tools">
          {!isPhone ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="filing-lightbox__icon-btn"
                onClick={zoomOut}
                disabled={scale <= MIN_SCALE}
                aria-label="کوچک‌نمایی"
              >
                <ZoomOut className="size-5" />
              </Button>
              <span className="filing-lightbox__zoom-label">{zoomPercent}٪</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="filing-lightbox__icon-btn"
                onClick={zoomIn}
                disabled={scale >= MAX_SCALE}
                aria-label="بزرگ‌نمایی"
              >
                <ZoomIn className="size-5" />
              </Button>
            </>
          ) : null}
          {scale > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="filing-lightbox__icon-btn"
              onClick={resetTransform}
              aria-label="بازنشانی زوم"
            >
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
          {!isPhone ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="filing-lightbox__icon-btn"
              onClick={() => void handleDownload()}
              disabled={downloading}
              aria-label="دانلود تصویر"
            >
              {downloading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Download className="size-5" />
              )}
            </Button>
          ) : null}
        </div>
      </header>

      <div
        ref={viewportRef}
        className="filing-lightbox__stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragY && scale <= 1 ? `translateY(${dragY}px)` : undefined,
          transition: draggingDismiss ? 'none' : 'transform 0.22s ease-out',
        }}
      >
        {hasPrev && scale <= 1 && !isPhone ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="filing-lightbox__nav filing-lightbox__nav--prev"
            onClick={goPrev}
            aria-label="تصویر قبلی"
          >
            <ChevronRight className="size-7" />
          </Button>
        ) : null}

        <div
          className={cn(
            'filing-lightbox__frame',
            scale > 1 ? 'is-zoomed' : 'is-fit'
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: liveTransform ? 'none' : 'transform 0.18s ease-out',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            key={url}
            src={url}
            alt={title}
            className="filing-lightbox__image"
            draggable={false}
          />
        </div>

        {hasNext && scale <= 1 && !isPhone ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="filing-lightbox__nav filing-lightbox__nav--next"
            onClick={goNext}
            aria-label="تصویر بعدی"
          >
            <ChevronLeft className="size-7" />
          </Button>
        ) : null}
      </div>

      <footer className="filing-lightbox__footer" dir="rtl">
        {images.length > 1 ? (
          <div className="filing-lightbox__filmstrip" ref={filmstripRef} role="tablist" aria-label="انتخاب تصویر">
            {images.map((thumb, i) => (
              <button
                key={`${thumb}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`تصویر ${i + 1}`}
                onClick={() => onIndexChange(i)}
                className={cn('filing-lightbox__thumb', i === index && 'is-active')}
              >
                <img src={thumb} alt="" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}
        <p className="filing-lightbox__hint">{hintText}</p>
      </footer>
    </div>
  );

  return createPortal(content, document.body);
}
