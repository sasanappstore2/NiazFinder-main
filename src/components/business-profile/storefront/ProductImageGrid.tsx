'use client';

import * as React from 'react';
import Image from 'next/image';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';

const MAX_IMAGES = 8;

export function ProductImageGrid({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const upload = async (file: File) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`حداکثر ${MAX_IMAGES.toLocaleString('fa-IR')} تصویر`);
      return;
    }
    setUploading(true);
    try {
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
        toast.error(data.error ?? 'آپلود ناموفق بود');
        return;
      }
      onChange([...images, data.url]);
    } catch {
      toast.error('خطا در آپلود');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (url: string) => onChange(images.filter((u) => u !== url));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">تصاویر محصول</p>
      <p className="text-xs text-muted-foreground">
        تا {MAX_IMAGES.toLocaleString('fa-IR')} تصویر — اولین تصویر روی کارت محصول نمایش داده می‌شود
      </p>
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div
            key={url}
            className="relative size-20 overflow-hidden rounded-lg border bg-muted"
          >
            <Image src={url} alt="" fill className="object-cover" sizes="80px" />
            <button
              type="button"
              className="absolute top-0.5 left-0.5 rounded-full bg-black/60 p-0.5 text-white"
              onClick={() => remove(url)}
              aria-label="حذف تصویر"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed',
              'text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5'
            )}
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Camera className="size-5" />
                <span className="text-[10px]">افزودن</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </div>
  );
}
