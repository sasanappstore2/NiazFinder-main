'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, Star, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';

const MAX_IMAGES = 5;

type PendingSlot = {
  id: string;
  preview: string;
};

async function uploadListingImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', 'product');
  const res = await fetch('/api/business/me/media', {
    method: 'POST',
    headers: getClientAuthHeaders(),
    body: fd,
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? 'آپلود ناموفق بود');
  }
  return data.url;
}

export function ListingImagesUpload({
  images,
  onChange,
  onUploadingChange,
  className,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingSlot[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    onUploadingChange?.(pending.length > 0);
  }, [pending.length, onUploadingChange]);

  useEffect(
    () => () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    },
    []
  );

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const setCover = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next);
  };

  const enqueueFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      const room = MAX_IMAGES - images.length - pendingRef.current.length;
      if (room <= 0) {
        toast.message(`حداکثر ${MAX_IMAGES} تصویر`);
        return;
      }
      const batch = list.slice(0, room);

      for (const file of batch) {
        const id = `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const preview = URL.createObjectURL(file);
        setPending((prev) => [...prev, { id, preview }]);

        void (async () => {
          try {
            const url = await uploadListingImage(file);
            setPending((prev) => {
              const slot = prev.find((p) => p.id === id);
              if (slot) URL.revokeObjectURL(slot.preview);
              return prev.filter((p) => p.id !== id);
            });
            const next = [...imagesRef.current, url].slice(0, MAX_IMAGES);
            imagesRef.current = next;
            onChange(next);
          } catch (e) {
            setPending((prev) => {
              const slot = prev.find((p) => p.id === id);
              if (slot) URL.revokeObjectURL(slot.preview);
              return prev.filter((p) => p.id !== id);
            });
            toast.error(e instanceof Error ? e.message : 'آپلود ناموفق بود');
          }
        })();
      }
    },
    [onChange]
  );

  const openPicker = () => inputRef.current?.click();

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) enqueueFiles(e.dataTransfer.files);
  };

  const totalSlots = images.length + pending.length;
  const canAdd = totalSlots < MAX_IMAGES;
  const coverUrl = images[0];
  const heroPreview = coverUrl ?? pending[0]?.preview;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          تصاویر ملک ({totalSlots.toLocaleString('fa-IR')}/{MAX_IMAGES.toLocaleString('fa-IR')})
        </span>
        {pending.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            در حال آپلود...
          </span>
        )}
      </div>

      {/* Hero / drop zone — compact square cover */}
      <div className="flex flex-wrap items-start gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => canAdd && openPicker()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && canAdd) {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={canAdd ? onDragOver : undefined}
          onDragLeave={canAdd ? onDragLeave : undefined}
          onDrop={canAdd ? onDrop : undefined}
          className={cn(
            'relative aspect-square size-28 shrink-0 overflow-hidden rounded-xl border-2 border-dashed transition-colors sm:size-32',
            heroPreview ? 'border-border/60 bg-muted/15' : 'border-border/70 bg-muted/20',
            canAdd && 'cursor-pointer hover:border-primary/40 hover:bg-muted/30',
            dragOver && 'border-primary bg-primary/5'
          )}
        >
          {heroPreview ? (
            <>
              <Image src={heroPreview} alt="" fill className="object-cover" unoptimized />
              {coverUrl && (
                <span className="absolute bottom-1.5 start-1.5 flex items-center gap-0.5 rounded bg-background/90 px-1.5 py-0.5 text-[9px] font-medium shadow-sm">
                  <Star className="size-2.5 fill-primary text-primary" />
                  کاور
                </span>
              )}
              {!coverUrl && pending[0] && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2 text-center text-muted-foreground">
              <Upload className="size-5" />
              <span className="text-[10px] font-medium leading-tight text-foreground">افزودن عکس</span>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {(images.length > 0 || pending.length > 0 || canAdd) && (
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {images.map((url, index) => {
            const isCover = index === 0;
            return (
              <div
                key={`${url}-${index}`}
                role={isCover ? undefined : 'button'}
                tabIndex={isCover ? undefined : 0}
                onClick={isCover ? undefined : () => setCover(index)}
                onKeyDown={
                  isCover
                    ? undefined
                    : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCover(index);
                        }
                      }
                }
                className={cn(
                  'group relative size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted/20 transition-all',
                  isCover
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'cursor-pointer border-border/70 hover:border-primary/50'
                )}
              >
                <Image src={url} alt="" fill className="object-cover" unoptimized />

                {isCover ? (
                  <span className="absolute top-1 start-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Star className="size-2.5 fill-current" />
                  </span>
                ) : (
                  <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-background/90 py-0.5 text-center text-[9px] font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100 max-sm:opacity-90">
                    کاور
                  </span>
                )}

                <button
                  type="button"
                  className="absolute top-1 end-1 flex size-5 items-center justify-center rounded-full bg-background/95 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(index);
                  }}
                  aria-label="حذف تصویر"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}

          {pending.map((slot, index) => (
            <div
              key={slot.id}
              className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-dashed border-primary/40 bg-muted/30"
            >
              <Image src={slot.preview} alt="" fill className="object-cover opacity-60" unoptimized />
              <div className="absolute inset-0 flex items-center justify-center bg-background/25">
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
              {!coverUrl && index === 0 && (
                <span className="absolute bottom-1 inset-x-1 truncate text-center text-[8px] text-muted-foreground">
                  در حال آپلود
                </span>
              )}
            </div>
          ))}

          {canAdd && (
            <button
              type="button"
              onClick={openPicker}
              className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border/80 bg-muted/15 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <ImagePlus className="size-4" />
              <span className="text-[9px] font-medium">افزودن</span>
            </button>
          )}
          </div>
        )}
      </div>

      {!heroPreview && canAdd && (
        <p className="text-[10px] text-muted-foreground">
          کلیک کنید یا تصاویر را بکشید — حداکثر {MAX_IMAGES.toLocaleString('fa-IR')} عکس
        </p>
      )}

      {images.length > 1 && (
        <p className="text-[10px] text-muted-foreground">
          روی تصویر دلخواه «کاور» بزنید تا به‌عنوان تصویر اصلی آگهی نمایش داده شود.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) enqueueFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function listingImagesFromValue(value: {
  images?: string[];
  image?: string;
}): string[] {
  if (value.images?.length) return value.images.slice(0, MAX_IMAGES);
  return value.image ? [value.image] : [];
}
