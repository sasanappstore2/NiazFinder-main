'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatGalleryImage = {
  id: string;
  url: string;
  createdAt: string;
  senderLabel: string;
};

function filenameFromUrl(url: string): string {
  const base = url.split('/').pop() || 'image';
  return base.includes('.') ? base : `${base}.jpg`;
}

function formatGalleryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

interface ChatImageLightboxProps {
  images: ChatGalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function ChatImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: ChatImageLightboxProps) {
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goPrev();
      if (e.key === 'ArrowLeft') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleDownload = async () => {
    if (!current) return;
    setDownloading(true);
    try {
      const res = await fetch(current.url);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filenameFromUrl(current.url);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(current.url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.touches[0];
    const dy = t.clientY - touchRef.current.y;
    const dx = t.clientX - touchRef.current.x;
    if (Math.abs(dy) > Math.abs(dx)) {
      setDragY(dy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    touchRef.current = null;
    setDragging(false);

    if (Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      setDragY(0);
      return;
    }

    if (Math.abs(dx) > 48 && dt < 400) {
      if (dx > 0) goPrev();
      else goNext();
    }
    setDragY(0);
  };

  if (!current) return null;

  const dismissOpacity = Math.max(0.35, 1 - Math.abs(dragY) / 280);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="نمایش تصویر"
    >
      <div
        className="absolute inset-0 bg-black/92 transition-opacity"
        style={{ opacity: dismissOpacity }}
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 flex shrink-0 items-center justify-between px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="بستن"
        >
          <X className="size-5" />
        </Button>
        {images.length > 1 && (
          <span className="text-sm tabular-nums text-white/80">
            {index + 1} / {images.length}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 text-white hover:bg-white/10"
          onClick={() => void handleDownload()}
          disabled={downloading}
          aria-label="دانلود"
        >
          {downloading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Download className="size-5" />
          )}
        </Button>
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {hasPrev && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute start-2 z-20 hidden size-11 rounded-full bg-black/40 text-white hover:bg-black/60 md:inline-flex"
            onClick={goPrev}
            aria-label="تصویر قبلی"
          >
            <ChevronRight className="size-6" />
          </Button>
        )}

        { }
        <img
          key={current.id}
          src={current.url}
          alt=""
          className="max-h-[min(78vh,900px)] max-w-[min(96vw,1100px)] select-none object-contain"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />

        {hasNext && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-2 z-20 hidden size-11 rounded-full bg-black/40 text-white hover:bg-black/60 md:inline-flex"
            onClick={goNext}
            aria-label="تصویر بعدی"
          >
            <ChevronLeft className="size-6" />
          </Button>
        )}
      </div>

      <div
        className={cn(
          'relative z-10 shrink-0 border-t border-white/10 bg-black/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md'
        )}
        dir="rtl"
      >
        <p className="text-sm font-medium text-white">{current.senderLabel}</p>
        <p className="text-xs text-white/60">{formatGalleryDate(current.createdAt)}</p>
        <p className="mt-2 text-center text-[11px] text-white/45 md:hidden">
          برای بستن به بالا یا پایین بکشید · برای تصویر بعدی/قبلی به چپ/راست بکشید
        </p>
      </div>
    </div>
  );
}
