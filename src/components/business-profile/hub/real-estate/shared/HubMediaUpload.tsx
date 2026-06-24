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
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
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
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
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
      <div className="relative aspect-video overflow-hidden rounded-lg border border-dashed border-blue-500/30 bg-muted/30">
        {value ? (
          <>
            <Image src={value} alt="" fill className="object-cover" unoptimized />
            <button
              type="button"
              className="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 shadow"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <button
              type="button"
              className="absolute top-2 start-2 flex size-8 items-center justify-center rounded-full bg-background/90 shadow"
              onClick={() => onChange('')}
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-blue-500/5"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-blue-600" />
            ) : (
              <Camera className="size-6 text-blue-600/80" />
            )}
            <span className="text-xs">انتخاب تصویر</span>
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
