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
import { cn } from '@/lib/utils';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.35;

function filenameFromUrl(url: string, title: string, index: number): string {
  const base = url.split('/').pop()?.split('?')[0] || '';
  if (base.includes('.')) return base;
  const safe = title.replace(/[^\w\u0600-\u06FF-]+/g, '-').slice(0, 40) || 'product';
  return `${safe}-${index + 1}.jpg`;
}

export function ProductImageLightbox({
  images,
  title,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  title: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const url = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [draggingDismiss, setDraggingDismiss] = useState(false);
  const [liveTransform, setLiveTransform] = useState(false);

  const panRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const touchRef = useRef<{
    x: number;
    y: number;
    t: number;
    pinchDist?: number;
    pinchScale?: number;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetTransform();
  }, [index, resetTransform]);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (scale <= 1) {
        if (e.key === 'ArrowRight') goPrev();
        if (e.key === 'ArrowLeft') goNext();
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
      }
      if (e.key === '-') {
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
  }, [onClose, goPrev, goNext, scale, resetTransform]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const onDoubleClick = () => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2.5);
    }
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
    const next = clampPan(panRef.current.px + dx, panRef.current.py + dy, scale);
    setPan(next);
  };

  const onPointerUp = () => {
    panRef.current = null;
    setLiveTransform(false);
  };

  const pinchDistance = (touches: { length: number; 0?: Touch; 1?: Touch }) => {
    if (touches.length < 2) return 0;
    const a = touches[0]!;
    const b = touches[1]!;
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = pinchDistance(e.touches);
      touchRef.current = {
        x: 0,
        y: 0,
        t: Date.now(),
        pinchDist: dist,
        pinchScale: scale,
      };
      setLiveTransform(true);
      return;
    }
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    if (scale <= 1) setDraggingDismiss(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current?.pinchDist) {
      const dist = pinchDistance(e.touches);
      const ratio = dist / touchRef.current.pinchDist;
      const base = touchRef.current.pinchScale ?? 1;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, base * ratio));
      setScale(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return;
    }
    if (!touchRef.current || scale > 1) return;
    const t = e.touches[0];
    const dy = t.clientY - touchRef.current.y;
    const dx = t.clientX - touchRef.current.x;
    if (Math.abs(dy) > Math.abs(dx)) setDragY(dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchRef.current?.pinchDist) {
      touchRef.current = null;
      setLiveTransform(false);
      return;
    }
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    touchRef.current = null;
    setDraggingDismiss(false);

    if (scale <= 1) {
      if (Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx)) {
        onClose();
        setDragY(0);
        return;
      }
      if (Math.abs(dx) > 48 && dt < 400) {
        if (dx > 0) goPrev();
        else goNext();
      }
    }
    setDragY(0);
  };

  const zoomIn = () =>
    setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(MIN_SCALE, s - ZOOM_STEP);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });

  if (!url) return null;

  const dismissOpacity = scale > 1 ? 1 : Math.max(0.35, 1 - Math.abs(dragY) / 280);
  const zoomPercent = Math.round(scale * 100).toLocaleString('fa-IR');

  const content = (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`نمایش تصویر — ${title}`}
    >
      <div
        className="absolute inset-0 bg-black transition-opacity"
        style={{ opacity: dismissOpacity }}
        onClick={scale <= 1 ? onClose : resetTransform}
        aria-hidden
      />

      {/* Top bar */}
      <div className="relative z-10 flex shrink-0 items-center gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="بستن"
        >
          <X className="size-5" />
        </Button>

        <div className="min-w-0 flex-1 text-center" dir="rtl">
          <p className="truncate text-sm font-medium">{title}</p>
          {images.length > 1 && (
            <p className="text-xs tabular-nums text-white/70">
              {(index + 1).toLocaleString('fa-IR')} / {images.length.toLocaleString('fa-IR')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-white hover:bg-white/10"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="کوچک‌نمایی"
          >
            <ZoomOut className="size-5" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-white/80">
            {zoomPercent}٪
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-white hover:bg-white/10"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="بزرگ‌نمایی"
          >
            <ZoomIn className="size-5" />
          </Button>
          {scale > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 text-white hover:bg-white/10"
              onClick={resetTransform}
              aria-label="بازنشانی زوم"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-white hover:bg-white/10"
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
        </div>
      </div>

      {/* Main viewport */}
      <div
        ref={viewportRef}
        className="relative z-10 flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden px-2"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragY && scale <= 1 ? `translateY(${dragY}px)` : undefined,
          transition: draggingDismiss ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {hasPrev && scale <= 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute start-1 z-20 size-12 rounded-full bg-black/50 text-white hover:bg-black/70 md:start-4"
            onClick={goPrev}
            aria-label="تصویر قبلی"
          >
            <ChevronRight className="size-7" />
          </Button>
        )}

        <div
          className={cn(
            'flex max-h-full max-w-full items-center justify-center',
            scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: liveTransform ? 'none' : 'transform 0.15s ease-out',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onClick={(e) => e.stopPropagation()}
        >
          { }
          <img
            key={url}
            src={url}
            alt={title}
            className="max-h-[min(100dvh-10rem,920px)] max-w-[min(100vw-1rem,1200px)] select-none object-contain"
            draggable={false}
          />
        </div>

        {hasNext && scale <= 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-1 z-20 size-12 rounded-full bg-black/50 text-white hover:bg-black/70 md:end-4"
            onClick={goNext}
            aria-label="تصویر بعدی"
          >
            <ChevronLeft className="size-7" />
          </Button>
        )}
      </div>

      {/* Bottom hint + thumbnails */}
      <div
        className="relative z-10 shrink-0 border-t border-white/10 bg-black/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
        dir="rtl"
      >
        {images.length > 1 && (
          <div className="mb-3 flex justify-center gap-2 overflow-x-auto pb-1">
            {images.map((thumb, i) => (
              <button
                key={`${thumb}-${i}`}
                type="button"
                onClick={() => onIndexChange(i)}
                className={cn(
                  'relative size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white/10 transition',
                  i === index ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                { }
                <img src={thumb} alt="" className="size-full object-contain p-0.5" />
              </button>
            ))}
          </div>
        )}
        <p className="text-center text-[11px] text-white/50">
          دوبار کلیک برای زوم · اسکرول یا پینچ · کشیدن برای جابه‌جایی وقتی زوم فعال است
          {scale <= 1 && ' · کشیدن عمودی برای بستن'}
        </p>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
