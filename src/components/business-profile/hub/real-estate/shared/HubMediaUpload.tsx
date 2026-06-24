'use client';

import * as React from 'react';
import Image from 'next/image';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';

export function HubMediaUpload({
  value,
  onChange,
  label = 'تصویر',
  className,
  compact = false,
  hideLabel = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  compact?: boolean;
  hideLabel?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const upload = async (file: File) => {
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
      onChange(data.url);
      toast.success('تصویر ذخیره شد');
    } catch {
      toast.error('خطا در آپلود');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col', hideLabel ? 'gap-0' : 'gap-2', className)}>
      {!hideLabel && (
        <div className="flex min-h-4 items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {value && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange('')}
            >
              حذف
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed border-border/80 bg-muted/25',
          compact ? 'size-[5.5rem] shrink-0 sm:size-28' : 'aspect-video w-full'
        )}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill className="object-cover" unoptimized />
            <button
              type="button"
              className="absolute bottom-1.5 end-1.5 flex size-7 items-center justify-center rounded-full bg-background/95 shadow-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label="تغییر تصویر"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            </button>
            <button
              type="button"
              className="absolute bottom-1.5 start-1.5 flex size-7 items-center justify-center rounded-full bg-background/95 shadow-sm"
              onClick={() => onChange('')}
              aria-label="حذف تصویر"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:bg-muted/40"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
            <span className="text-[10px] font-medium">{compact ? 'افزودن عکس' : 'انتخاب تصویر'}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}
